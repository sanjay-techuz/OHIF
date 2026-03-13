import { DicomMetadataStore, Enums, log, utils } from '@ohif/core';
import isSeriesFilterUsed from '../../utils/isSeriesFilterUsed';
import getStudies from './studiesList';

const { getSplitParam } = utils;

/**
 * Initialize the route.
 *
 * @param props.servicesManager to read services from
 * @param props.studyInstanceUIDs for a list of studies to read
 * @param props.dataSource to read the data from
 * @param props.filters filters from query params to read the data from
 * @returns array of subscriptions to cancel
 */
export async function defaultRouteInit(
  {
    servicesManager,
    commandsManager,
    studyInstanceUIDs,
    dataSource,
    filters,
    appConfig,
  }: withAppTypes,
  hangingProtocolId,
  stageIndex
) {
  const { displaySetService, hangingProtocolService, uiNotificationService, customizationService } =
    servicesManager.services;
  /**
   * Function to apply the hanging protocol when the minimum number of display sets were
   * received or all display sets retrieval were completed
   * @returns
   */
  function applyHangingProtocol() {
    const displaySets = displaySetService.getActiveDisplaySets();

    if (!displaySets || !displaySets.length) {
      return;
    }

    // Dynamically set the viewport grid layout based on the number of image display sets (cases)
    // Filter out overlays, unsupported, and display sets without a description/label
    const imageDisplaySets = displaySets.filter(ds => {
      // Exclude overlays (SEG, RTSTRUCT, etc.), unsupported, and empty/unknown
      if (ds.isOverlayDisplaySet || ds.unsupported) {
        return false;
      }
      // Exclude display sets without a description or label
      if (!ds.SeriesDescription && !ds.label) {
        return false;
      }
      // Optionally, filter by Modality if needed (e.g., exclude SR, PR, etc.)
      if (['SR', 'PR', 'SEG', 'RTSTRUCT', 'SM'].includes(ds.Modality)) {
        return false;
      }
      return true;
    });
    const numCases = imageDisplaySets.length;

    // Calculate grid layout (rows x cols)
    let numRows = 1;
    let numCols = 1;

    // If this is a mammography study (Modality "MG"), always start with a 1x4 layout.
    // This matches the desired mammo layout and avoids a 2x2 -> 1x4 jump.
    const isMammography = imageDisplaySets.some(ds => ds.Modality === 'MG');

    if (isMammography) {
      numRows = 1;
      numCols = 4;
    } else if (numCases === 1) {
      numRows = 1;
      numCols = 1;
    } else if (numCases === 2) {
      numRows = 1;
      numCols = 2;
    } else if (numCases === 3) {
      numRows = 1;
      numCols = 3;
    } else if (numCases === 4) {
      numRows = 2;
      numCols = 2;
    } else if (numCases <= 6) {
      numRows = 2;
      numCols = 3;
    } else if (numCases <= 9) {
      numRows = 3;
      numCols = 3;
    } else {
      // For more than 9, use a single row with N columns (may want to improve this for large N)
      numRows = 1;
      numCols = 1;
    }

    setTimeout(
      () =>
        commandsManager?.run({
          commandName: 'setViewportGridLayout',
          commandOptions: {
            numRows: numRows,
            numCols: numCols,
          },
        }),
      100
    );

    // Gets the studies list to use
    const studies = getStudies(studyInstanceUIDs, displaySets);

    // study being displayed, and is thus the "active" study.
    const activeStudy = studies[0];

    // run the hanging protocol matching on the displaySets with the predefined
    // hanging protocol in the mode configuration
    hangingProtocolService.run({ studies, activeStudy, displaySets }, hangingProtocolId, {
      stageIndex,
    });
  }

  const unsubscriptions = [];
  const issuedWarningSeries = [];
  const { unsubscribe: instanceAddedUnsubscribe } = DicomMetadataStore.subscribe(
    DicomMetadataStore.EVENTS.INSTANCES_ADDED,
    function ({ StudyInstanceUID, SeriesInstanceUID, madeInClient = false }) {
      const seriesMetadata = DicomMetadataStore.getSeries(StudyInstanceUID, SeriesInstanceUID);

      // checks if the series filter was used, if it exists
      const seriesInstanceUIDs = filters?.seriesInstanceUID;
      if (
        seriesInstanceUIDs?.length &&
        !isSeriesFilterUsed(seriesMetadata.instances, filters) &&
        !issuedWarningSeries.includes(seriesInstanceUIDs[0])
      ) {
        // stores the series instance filter so it shows only once the warning
        issuedWarningSeries.push(seriesInstanceUIDs[0]);
        uiNotificationService.show({
          title: 'Series filter',
          message: `Each of the series in filter: ${seriesInstanceUIDs} are not part of the current study. The entire study is being displayed`,
          type: 'error',
          duration: 7000,
        });
      }

      displaySetService.makeDisplaySets(seriesMetadata.instances, { madeInClient });
    }
  );

  unsubscriptions.push(instanceAddedUnsubscribe);

  log.time(Enums.TimingEnum.STUDY_TO_DISPLAY_SETS);
  log.time(Enums.TimingEnum.STUDY_TO_FIRST_IMAGE);

  const allRetrieves = studyInstanceUIDs.map(StudyInstanceUID =>
    dataSource.retrieve.series.metadata({
      StudyInstanceUID,
      filters,
      returnPromises: true,
      sortCriteria: customizationService.getCustomization('sortingCriteria'),
    })
  );

  // log the error if this fails, otherwise it's so difficult to tell what went wrong...
  allRetrieves.forEach(retrieve => {
    retrieve.catch(error => {
      console.error(error);
    });
  });

  // is displaysets from URL and has initialSOPInstanceUID or initialSeriesInstanceUID
  // then we need to wait for all display sets to be retrieved before applying the hanging protocol
  const params = new URLSearchParams(window.location.search);

  const initialSeriesInstanceUID = getSplitParam('initialseriesinstanceuid', params);
  const initialSOPInstanceUID = getSplitParam('initialsopinstanceuid', params);

  let displaySetFromUrl = false;
  if (initialSeriesInstanceUID || initialSOPInstanceUID) {
    displaySetFromUrl = true;
  }

  await Promise.allSettled(allRetrieves).then(async promises => {
    log.timeEnd(Enums.TimingEnum.STUDY_TO_DISPLAY_SETS);
    log.time(Enums.TimingEnum.DISPLAY_SETS_TO_FIRST_IMAGE);
    log.time(Enums.TimingEnum.DISPLAY_SETS_TO_ALL_IMAGES);

    const allPromises = [];
    const remainingPromises = [];

    function startRemainingPromises(remainingPromises) {
      remainingPromises.forEach(p => p.forEach(p => p.start()));
    }

    promises.forEach(promise => {
      const retrieveSeriesMetadataPromise = promise.value;
      if (!Array.isArray(retrieveSeriesMetadataPromise)) {
        return;
      }

      if (displaySetFromUrl) {
        const requiredSeriesPromises = retrieveSeriesMetadataPromise.map(promise =>
          promise.start()
        );
        allPromises.push(Promise.allSettled(requiredSeriesPromises));
      } else {
        const { requiredSeries, remaining } = hangingProtocolService.filterSeriesRequiredForRun(
          hangingProtocolId,
          retrieveSeriesMetadataPromise
        );
        const requiredSeriesPromises = requiredSeries.map(promise => promise.start());
        allPromises.push(Promise.allSettled(requiredSeriesPromises));
        remainingPromises.push(remaining);
      }
    });

    await Promise.allSettled(allPromises).then(applyHangingProtocol);
    startRemainingPromises(remainingPromises);
    applyHangingProtocol();
  });

  return unsubscriptions;
}

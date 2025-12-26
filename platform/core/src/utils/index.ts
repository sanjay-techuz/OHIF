import absoluteUrl from './absoluteUrl';
import b64toBlob from './b64toBlob.js';
import guid from './guid';
import ObjectPath from './objectPath';
import sortBy from './sortBy.js';
import uuidv4 from './uuidv4';
import writeScript from './writeScript.js';
//import loadAndCacheDerivedDisplaySets from './loadAndCacheDerivedDisplaySets.js';
import addAccessors from './addAccessors';
import { createStudyBrowserTabs } from './createStudyBrowserTabs';
import debounce from './debounce';
import downloadCSVReport from './downloadCSVReport';
import formatDate from './formatDate';
import formatPN from './formatPN';
import formatTime from './formatTime';
import generateAcceptHeader from './generateAcceptHeader';
import getClosestOrientationFromIOP from './getClosestOrientationFromIOP';
import hierarchicalListUtils from './hierarchicalListUtils';
import hotkeys from './hotkeys';
import imageIdToURI from './imageIdToURI';
import isDicomUid from './isDicomUid';
import isDisplaySetReconstructable from './isDisplaySetReconstructable';
import isEqualWithin from './isEqualWithin';
import { isImage } from './isImage';
import isLowPriorityModality from './isLowPriorityModality';
import makeCancelable from './makeCancelable';
import makeDeferred from './makeDeferred';
import * as MeasurementFilters from './measurementFilters';
import progressTrackingUtils from './progressTrackingUtils';
import Queue from './Queue';
import resolveObjectPath from './resolveObjectPath';
import roundNumber from './roundNumber';
import { sopClassDictionary } from './sopClassDictionary';
import sortInstancesByPosition from './sortInstancesByPosition';
import {
  instancesSortCriteria,
  seriesSortCriteria,
  sortStudy,
  sortStudyInstances,
  sortStudySeries,
  sortingCriteria,
} from './sortStudy';
import { getSplitParam, splitComma } from './splitComma';
import urlUtil from './urlUtil';
// Commented out unused functionality.
// Need to implement new mechanism for derived displaySets using the displaySetManager.

const utils = {
  guid,
  uuidv4,
  ObjectPath,
  absoluteUrl,
  sortBy,
  sortBySeriesDate: sortStudySeries,
  sortStudy,
  sortStudySeries,
  sortStudyInstances,
  sortingCriteria,
  seriesSortCriteria,
  instancesSortCriteria,
  writeScript,
  formatDate,
  formatTime,
  formatPN,
  b64toBlob,
  urlUtil,
  imageIdToURI,
  //loadAndCacheDerivedDisplaySets,
  makeDeferred,
  makeCancelable,
  hotkeys,
  Queue,
  isDicomUid,
  isEqualWithin,
  sopClassDictionary,
  addAccessors,
  resolveObjectPath,
  hierarchicalListUtils,
  progressTrackingUtils,
  isLowPriorityModality,
  isImage,
  isDisplaySetReconstructable,
  debounce,
  roundNumber,
  downloadCSVReport,
  splitComma,
  getSplitParam,
  generateAcceptHeader,
  createStudyBrowserTabs,
  MeasurementFilters,
  getClosestOrientationFromIOP,
};

export {
  MeasurementFilters,
  ObjectPath,
  Queue,
  absoluteUrl,
  b64toBlob,
  createStudyBrowserTabs,
  debounce,
  downloadCSVReport,
  formatDate,
  generateAcceptHeader,
  getClosestOrientationFromIOP,
  getSplitParam,
  guid,
  hierarchicalListUtils,
  hotkeys,
  imageIdToURI,
  isDicomUid,
  isDisplaySetReconstructable,
  isEqualWithin,
  isImage,
  isLowPriorityModality,
  makeCancelable,
  //loadAndCacheDerivedDisplaySets,
  makeDeferred,
  progressTrackingUtils,
  resolveObjectPath,
  roundNumber,
  sortBy,
  sortInstancesByPosition,
  splitComma,
  urlUtil,
  writeScript,
};

export * from './apiUtils';
export * from './cryptoUtils';
export * from './urlUtils';

export default utils;

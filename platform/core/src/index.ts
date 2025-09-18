import classes, { CommandsManager, HotkeysManager } from './classes';
import { SystemContextProvider, useSystem } from './contextProviders/SystemProvider';
import { ExtensionManager, MODULE_TYPES } from './extensions';
import { ViewportRefsProvider } from './hooks/useViewportRef';
import { ServiceProvidersManager, ServicesManager } from './services';

import defaults from './defaults';
import DICOMWeb from './DICOMWeb';
import * as Enums from './enums';
import errorHandler from './errorHandler.js';
import log from './log.js';
import object from './object.js';
import {
  CineService,
  CustomizationService,
  //
  DicomMetadataStore,
  DisplaySetService,
  HangingProtocolService,
  MeasurementService,
  MultiMonitorService,
  PanelService,
  PubSubService,
  pubSubServiceInterface,
  StudyPrefetcherService,
  ToolbarService,
  UIDialogService,
  UIModalService,
  UINotificationService,
  UIViewportDialogService,
  UserAuthenticationService,
  ViewportGridService,
  WorkflowStepsService,
} from './services';
import string from './string.js';
import * as Types from './types';
import user from './user.js';
import utils from './utils';

import { DisplaySetMessage, DisplaySetMessageList } from './services/DisplaySetService';

import IWebApiDataSource from './DataSources/IWebApiDataSource';
import useActiveViewportDisplaySets from './hooks/useActiveViewportDisplaySets';

export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';

const hotkeys = {
  ...utils.hotkeys,
  defaults: { hotkeyBindings: defaults.hotkeyBindings },
};

const OHIF = {
  MODULE_TYPES,
  //
  CommandsManager,
  ExtensionManager,
  HotkeysManager,
  ServicesManager,
  ServiceProvidersManager,
  //
  defaults,
  utils,
  hotkeys,
  classes,
  string,
  user,
  errorHandler,
  object,
  log,
  DICOMWeb,
  viewer: {},
  //
  CineService,
  CustomizationService,
  UIDialogService,
  UIModalService,
  UINotificationService,
  UIViewportDialogService,
  DisplaySetService,
  MeasurementService,
  ToolbarService,
  ViewportGridService,
  HangingProtocolService,
  UserAuthenticationService,
  MultiMonitorService,
  IWebApiDataSource,
  DicomMetadataStore,
  pubSubServiceInterface,
  PubSubService,
  PanelService,
  useActiveViewportDisplaySets,
  WorkflowStepsService,
  StudyPrefetcherService,
};

export {
  //
  CineService,
  classes,
  //
  CommandsManager,
  CustomizationService,
  //
  defaults,
  DicomMetadataStore,
  DICOMWeb,
  DisplaySetMessage,
  DisplaySetMessageList,
  DisplaySetService,
  Enums,
  errorHandler,
  ExtensionManager,
  HangingProtocolService,
  hotkeys,
  HotkeysManager,
  IWebApiDataSource,
  log,
  MeasurementService,
  MODULE_TYPES,
  MultiMonitorService,
  object,
  PanelService,
  PubSubService,
  pubSubServiceInterface,
  ServiceProvidersManager,
  ServicesManager,
  string,
  StudyPrefetcherService,
  SystemContextProvider,
  ToolbarService,
  UIDialogService,
  UIModalService,
  UINotificationService,
  UIViewportDialogService,
  useActiveViewportDisplaySets,
  user,
  UserAuthenticationService,
  useSystem,
  utils,
  ViewportGridService,
  ViewportRefsProvider,
  WorkflowStepsService,
};

export { OHIF };

export type { Types };

export default OHIF;

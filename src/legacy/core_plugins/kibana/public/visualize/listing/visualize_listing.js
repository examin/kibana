/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import chrome from 'ui/chrome';

import { VisualizeListingTable } from './visualize_listing_table';
import { NewVisModal } from '../wizard/new_vis_modal';
import { VisualizeConstants } from '../visualize_constants';

import { i18n } from '@kbn/i18n';
import { injectI18nProvider } from '@kbn/i18n/react';

const app = uiModules.get('app/visualize', ['ngRoute', 'react']);
app.directive('visualizeListingTable', reactDirective => reactDirective(injectI18nProvider(VisualizeListingTable)));
app.directive('newVisModal', reactDirective => reactDirective(injectI18nProvider(NewVisModal)));

export function VisualizeListingController($injector, createNewVis) {
  const Notifier = $injector.get('Notifier');
  const Private = $injector.get('Private');
  const config = $injector.get('config');
  const kbnUrl = $injector.get('kbnUrl');

  this.visTypeRegistry = Private(VisTypesRegistryProvider);

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  this.showNewVisModal = false;

  this.createNewVis = () => {
    this.showNewVisModal = true;
  };

  this.closeNewVisModal = () => {
    this.showNewVisModal = false;
    // In case the user came via a URL to this page, change the URL to the regular landing page URL after closing the modal
    if (createNewVis) {
      kbnUrl.changePath(VisualizeConstants.LANDING_PAGE_PATH);
    }
  };

  if (createNewVis) {
    // In case the user navigated to the page via the /visualize/new URL we start the dialog immediately
    this.createNewVis();
  }

  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const visualizationService = services.visualizations;
  const notify = new Notifier({ location: 'Visualize' });

  this.fetchItems = (filter) => {
    const isLabsEnabled = config.get('visualize:enableLabs');
    return visualizationService.find(filter, config.get('savedObjects:listingLimit'))
      .then(result => {
        this.totalItems = result.total;
        this.showLimitError = result.total > config.get('savedObjects:listingLimit');
        this.listingLimit = config.get('savedObjects:listingLimit');
        return result.hits.filter(result => (isLabsEnabled || result.type.stage !== 'experimental'));
      });
  };

  this.deleteSelectedItems = function deleteSelectedItems(selectedIds) {
    return visualizationService.delete(selectedIds)
      .catch(error => notify.error(error));
  };

  chrome.breadcrumbs.set([{
    text: i18n.translate('kbn.visualize.visualizeListingBreadcrumbsTitle', {
      defaultMessage: 'Visualize',
    })
  }]);
  config.watch('k7design', (val) => this.showPluginBreadcrumbs = !val);
}

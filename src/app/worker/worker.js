/**
* CONFIDENTIAL
* Copyright 2016 Red Hat, Inc. and/or its affiliates.
* This is unpublished proprietary source code of Red Hat.
**/
'use strict';

var _ = require('lodash');
require('angular-messages');

module.exports = 'app.worker';

angular.module('app.worker', [
  'ui.router'
, 'wfm.core.mediator'
])

.config(function($stateProvider) {
  $stateProvider
    .state('app.worker', {
      url: '/workers',
      resolve: {
        workers: function(userClient) {
          return userClient.list();
        }
      },
      views: {
        column2: {
          templateUrl: 'app/worker/worker-list.tpl.html',
          controller: 'WorkerListController as ctrl',
        },
        'content': {
          templateUrl: 'app/worker/empty.tpl.html',
        }
      }
    })
    .state('app.worker.detail', {
      url: '/worker/:workerId',
      resolve: {
        worker: function($stateParams, userClient) {
          return userClient.read($stateParams.workerId);
        },
        workorders: function($stateParams, workorderManager) {
          return workorderManager.list().then(function(workorders) {
            return workorders.filter(function(workorder) {
              return String(workorder.assignee) === String($stateParams.workerId);
            });
          });
        },
        messages: function($stateParams, messageManager) {
          return messageManager.list().then(function(messages){
            return messages.filter(function(message) {
             return String(message.receiverId) === String($stateParams.workerId);
           });
          });
        },
        files: function($stateParams, fileClient) {
          return fileClient.list().then(function(files){
            return files.filter(function(file) {
             return String(file.owner) === String($stateParams.workerId);
           });
          })
        }
      },
      views: {
        'content@app': {
          templateUrl: 'app/worker/worker-detail.tpl.html',
          controller: 'WorkerDetailController as ctrl'
        }
      }
    })
    .state('app.worker.edit', {
      url: '/worker/:workerId/edit',
      resolve: {
        worker: function($stateParams, userClient) {
          return userClient.read($stateParams.workerId);
        }
      },
      views: {
        'content@app': {
          templateUrl: 'app/worker/worker-edit.tpl.html',
          controller: 'WorkerFormController as ctrl',
        }
      }
    })
    .state('app.worker.new', {
      url: '/new',
      resolve: {
        worker: function() {
          return {};
        }
      },
      views: {
        'content@app': {
          templateUrl: 'app/worker/worker-edit.tpl.html',
          controller: 'WorkerFormController as ctrl',
        }
      }
    });
})

.run(function($state, mediator) {
  mediator.subscribe('worker:selected', function(worker) {
    $state.go('app.worker.detail', {
      workerId: worker.id
    });
  });
})

.controller('WorkerListController', function ($scope, mediator, workers) {
  var self = this;
  self.workers = workers;
  $scope.$parent.selected = {id: null};
  self.applyFilter = function(term) {
    term = term.toLowerCase();
    self.workers = workers.filter(function(worker) {
      return String(worker.id).indexOf(term) !== -1
        || String(worker.name).toLowerCase().indexOf(term) !== -1;
    });
  };
})

.controller('WorkerDetailController', function ($scope, $state, $stateParams, $mdDialog, mediator, worker, workorders, messages, files, userClient) {
  var self = this;
  self.worker = worker;
  self.workorders = workorders;
  self.messages =  messages;
  self.files = files;
  $scope.selected.id = worker.id;
  var bannerUrl = worker.banner || worker.avatar;
  self.style = {
    'background-image': 'url(' + bannerUrl + ')',
    'background-position': worker.banner ? 'center center' : 'top center',
    'background-size': worker.banner ? 'auto' : 'contain',
    'background-repeat': 'no-repeat'
  }
  console.log('style', this.style);
  self.delete = function(event, worker) {
    event.preventDefault();
    var confirm = $mdDialog.confirm()
          .title('Would you like to delete worker #'+worker.id+'?')
          .textContent(worker.name)
          .ariaLabel('Delete Worker')
          .targetEvent(event)
          .ok('Proceed')
          .cancel('Cancel');
    $mdDialog.show(confirm).then(function() {
      userClient.delete(worker)
      .then(function() {
        $state.go('app.worker', null, {reload: true});
      }, function(err) {
        throw err;
      })
    });
  },
  self.selectWorkorder = function(workorder) {
    $state.go(
      'app.workorder.detail',
      { workorderId: workorder.id || workorder._localuid },
      { reload: true }
    );
  },
  self.selectMessage =  function(message) {
    $state.go('app.message.detail', {
      messageId: message.id || message._localuid },
      { reload: true }
    );
  }

})

.controller('WorkerFormController', function ($state, mediator, worker, userClient) {
  var self = this;
  self.worker = worker;

  self.done = function(valid) {
    if (valid) {
      if (self.worker.id || self.worker.id === 0) {
        userClient.update(self.worker)
        .then(function() {
          $state.go('app.worker.detail', {workerId: self.worker.id}, {reload: true});
        })
      } else {
        userClient.create(self.worker)
        .then(function(createdWorker) {
          $state.go('app.worker.detail', {workerId: createdWorker.id}, {reload: true});
        })
      }
    }
  }
})

;

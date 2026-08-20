function waitForElement(selector, maxAttempts = 20, interval = 25) {
  return new Promise(resolve => {
    let attempts = 0;

    const checkForElement = setInterval(() => {
      const element = document.querySelector(selector);

      if (element || attempts >= maxAttempts) {
        clearInterval(checkForElement);
        resolve();
      }

      attempts++;
    }, interval);
  });
}

export default {
  'ohif.tours': [
    {
      id: 'basicViewerTour',
      route: '/viewer',
      steps: [
        {
          id: 'scroll',
          title: 'Scrolling Through Images',
          text: 'You can scroll through the images using the mouse wheel or scrollbar.',
          attachTo: {
            element: '.viewport-element',
            on: 'top',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_WHEEL',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'zoom',
          title: 'Zooming In and Out',
          text: 'You can zoom the images using the right click.',
          attachTo: {
            element: '.viewport-element',
            on: 'left',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_UP',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'pan',
          title: 'Panning the Image',
          text: 'You can pan the images using the middle click.',
          attachTo: {
            element: '.viewport-element',
            on: 'top',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_UP',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'windowing',
          title: 'Adjusting Window Level',
          text: 'You can modify the window level using the left click.',
          attachTo: {
            element: '.viewport-element',
            on: 'left',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_UP',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'length',
          title: 'Using the Measurement Tools',
          text: 'You can measure the length of a region using the Length tool.',
          attachTo: {
            element: '[data-cy="MeasurementTools-split-button-primary"]',
            on: 'bottom',
          },
          advanceOn: {
            selector: '[data-cy="MeasurementTools-split-button-primary"]',
            event: 'click',
          },
          beforeShowPromise: () =>
            waitForElement('[data-cy="MeasurementTools-split-button-primary]'),
        },
        {
          id: 'drawAnnotation',
          title: 'Drawing Length Annotations',
          text: 'Use the length tool on the viewport to measure the length of a region.',
          attachTo: {
            element: '.viewport-element',
            on: 'right',
          },
          advanceOn: {
            selector: 'body',
            event: 'event::measurement_added',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'scrollAwayFromMeasurement',
          title: 'Scrolling Away from a Measurement',
          text: 'Scroll the images using the mouse wheel away from the measurement.',
          attachTo: {
            element: '.viewport-element',
            on: 'left',
          },
          advanceOn: {
            selector: '.cornerstone-viewport-element',
            event: 'CORNERSTONE_TOOLS_MOUSE_WHEEL',
          },
          beforeShowPromise: () => waitForElement('.viewport-element'),
        },
        {
          id: 'changeLayout',
          title: 'Changing Layout',
          text: 'You can change the layout of the viewer using the layout button.',
          attachTo: {
            element: '[data-cy="Layout"]',
            on: 'bottom',
          },
          advanceOn: {
            selector: '[data-cy="Layout"]',
            event: 'click',
          },
          beforeShowPromise: () => waitForElement('[data-cy="Layout"]'),
        },
        {
          id: 'selectLayout',
          title: 'Selecting the MPR Layout',
          text: 'Select the MPR layout to view the images in MPR mode.',
          attachTo: {
            element: '[data-cy="MPR"]',
            on: 'left-start',
          },
          advanceOn: {
            selector: '[data-cy="MPR"]',
            event: 'click',
          },
          beforeShowPromise: () => waitForElement('[data-cy="MPR"]'),
        },
      ],
      tourOptions: {
        useModalOverlay: true,
        defaultStepOptions: {
          // Every step keeps its `advanceOn` action (performing the gesture
          // still moves the tour along), but Back/Next make the tour READABLE
          // without forcing the user to perform every gesture in order.
          // `this` is the Tour instance inside a button action.
          // Footer reads as pagination:  ‹  10/12  ›            Skip all
          // The arrows and the step counter are grouped left (ordering is done
          // in Onboarding.css, since Shepherd appends the counter last), and
          // "Skip all" sits on the right in pink. All three are `secondary` so
          // none of them picks up the default filled-button style; the skip
          // button is coloured via its own class.
          buttons: [
            {
              text: '‹',
              classes: 'shepherd-nav-btn shepherd-nav-prev',
              action() {
                // Shepherd's back() on the first step would try to show step -1.
                const index = this.steps.indexOf(this.getCurrentStep());
                if (index > 0) {
                  this.back();
                }
              },
              secondary: true,
            },
            {
              text: '›',
              classes: 'shepherd-nav-btn shepherd-nav-next',
              action() {
                // next() completes the tour when called on the last step.
                this.next();
              },
              secondary: true,
            },
            {
              text: 'Skip all',
              classes: 'shepherd-skip-btn',
              action() {
                this.complete();
              },
              secondary: true,
            },
          ],
        },
      },
    },
  ],
};

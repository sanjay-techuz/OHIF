import { Modal } from '@ohif/ui-next';
import React from 'react';

export interface InstructionModalProps {
  open: boolean;
  onClose: () => void;
}

const InstructionModal: React.FC<InstructionModalProps> = ({ open, onClose }) => {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title=""
      containerClassName="bg-popover shadow-lg p-10 max-w-[760px] !rounded-2xl max-h-[85vh] overflow-auto"
    >
      <p className="text-primary-light mb-12 border-b border-white/30 pb-4 text-2xl font-bold leading-tight">
        Instructions
      </p>
      <div className="grid gap-4 pb-10">
        <p className="text-primary-light text-xl font-bold leading-tight">The Tools Bar</p>
        <div className="flex items-center justify-between self-stretch rounded-[16px] border border-white/30 px-4 py-2">
          <img
            className="w-full"
            src="assets/container.png"
            alt="OHIF"
          />
        </div>
      </div>

      <div className="pb-p mb-12 grid gap-10 border-b border-white/10 pb-6">
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
              >
                <path
                  d="M3.75 15H26.25M3.75 7.5H26.25M3.75 22.5H26.25"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Series Window</h5>
            <p className="text-[12px] text-white/80">
              Open by default, you can hide by clicking on the series icon. the images of a case as
              thumbnails on the right side of the screen. You can drag images from this window to
              the main windows allowing you too view extra images on the test/answers windows.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
                className="h-[28px] w-[28px]"
              >
                <path
                  d="M5.80566 12.139L1.05566 16.889M1.05566 16.889L5.80566 21.639M1.05566 16.889H32.7223M12.139 5.80566L16.889 1.05566M16.889 1.05566L21.639 5.80566M16.889 1.05566V32.7223M21.639 27.9723L16.889 32.7223M16.889 32.7223L12.139 27.9723M27.9723 12.139L32.7223 16.889M32.7223 16.889L27.9723 21.639"
                  stroke="white"
                  strokeWidth="2.11111"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Pan</h5>
            <p className="text-[12px] text-white/80">
              When selected, you can use the mouse to click and hold, then move the mouse to move an
              image.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="31"
                height="31"
                viewBox="0 0 31 31"
                fill="none"
                className="h-[28px] w-[28px]"
              >
                <path
                  d="M29.4502 29.4502L23.9087 23.9085M27.8669 14.4085C27.8669 21.8414 21.8414 27.8669 14.4085 27.8669C6.9757 27.8669 0.950195 21.8414 0.950195 14.4085C0.950195 6.9757 6.9757 0.950195 14.4085 0.950195C21.8414 0.950195 27.8669 6.9757 27.8669 14.4085Z"
                  stroke="white"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Zoom</h5>
            <p className="text-[12px] text-white/80">
              Will allow you to zoom in and out of an image, user mouse scroll to zoom.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="38"
                height="38"
                viewBox="0 0 38 38"
                fill="none"
                className="h-[28px] w-[28px]"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M17.8125 5.99075C11.1548 6.5907 5.9375 12.1861 5.9375 19C5.9375 25.8139 11.1548 31.4092 17.8125 32.0093V5.99075ZM3.5625 19C3.5625 10.4741 10.4741 3.5625 19 3.5625C27.5259 3.5625 34.4375 10.4741 34.4375 19C34.4375 27.5259 27.5259 34.4375 19 34.4375C10.4741 34.4375 3.5625 27.5259 3.5625 19Z"
                  fill="white"
                ></path>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Window</h5>
            <p className="text-[12px] text-white/80">
              Changes contrast and brightness for an image, click and drag left/right for contrast
              or up/down for brightness.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="33"
                height="33"
                viewBox="0 0 33 33"
                fill="none"
                className="h-[28px] w-[28px]"
              >
                <path
                  d="M20.414 6.16389L22.789 8.53889M15.664 10.9139L18.039 13.2889M10.914 15.6639L13.289 18.0389M6.16401 20.4139L8.53901 22.7889M1.51794 25.2679L7.64327 31.3933C7.95679 31.7068 8.11354 31.8635 8.2943 31.9223C8.45331 31.9739 8.62458 31.9739 8.78358 31.9223C8.96434 31.8635 9.1211 31.7068 9.43461 31.3933L31.3933 9.43461C31.7068 9.1211 31.8635 8.96434 31.9223 8.78358C31.9739 8.62458 31.9739 8.45331 31.9223 8.2943C31.8635 8.11354 31.7068 7.95679 31.3933 7.64328L25.2679 1.51794C24.9544 1.20443 24.7977 1.04767 24.6169 0.988942C24.4579 0.93728 24.2866 0.93728 24.1276 0.988942C23.9469 1.04767 23.7901 1.20443 23.4766 1.51794L1.51794 23.4766C1.20443 23.7901 1.04767 23.9469 0.988942 24.1276C0.93728 24.2866 0.93728 24.4579 0.988942 24.6169C1.04767 24.7977 1.20443 24.9544 1.51794 25.2679Z"
                  stroke="white"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Length</h5>
            <p className="text-[12px] text-white/80">
              To measure the distance between two points, select the length tool, then click on the
              two points in the image to measure the distance.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                width="28px"
                height="28px"
                viewBox="0 0 28 28"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                className="h-[28px] w-[28px]"
              >
                <g
                  id="tool-circle"
                  stroke="none"
                  strokeWidth="1"
                  fill="none"
                  fillRule="evenodd"
                >
                  <rect
                    id="Rectangle"
                    x="0"
                    y="0"
                    width="28"
                    height="28"
                  ></rect>
                  <circle
                    id="Oval"
                    stroke="white"
                    strokeWidth="1.5"
                    cx="14"
                    cy="14"
                    r="9.5"
                  ></circle>
                </g>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Mark</h5>
            <p className="text-[12px] text-white/80">
              When selected, you can mark a region of interest.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                width="28px"
                height="28px"
                viewBox="0 0 28 28"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                className="h-[28px] w-[28px]"
              >
                <title>tool-layout</title>
                <g
                  id="tool-layout"
                  stroke="none"
                  strokeWidth="1"
                  fill="none"
                  fillRule="evenodd"
                >
                  <rect
                    id="Rectangle"
                    x="0"
                    y="0"
                    width="28"
                    height="28"
                  ></rect>
                  <g
                    id="Group"
                    transform="translate(0.5, 4)"
                    strokeLinecap="round"
                  >
                    <g
                      id="Group-3"
                      transform="translate(0, 0)"
                      stroke="white"
                      strokeWidth="1.25"
                    >
                      <path
                        d="M5.45696821e-12,9.49450549 L5.45696821e-12,17.3947362 C5.45710348e-12,18.4993057 0.8954305,19.3947362 2,19.3947362 L13.2443085,19.3947362 L13.2443085,19.3947362"
                        id="Path-3"
                      ></path>
                      <path
                        d="M9.49450549,0 L9.49450549,4.91369247 L9.49450549,6 C9.49450549,7.1045695 10.389936,8 11.4945055,8 L19.195248,8 L19.195248,8"
                        id="Path-3"
                        transform="translate(14.3449, 4) rotate(180) translate(-14.3449, -4)"
                      ></path>
                      <path
                        d="M0.0997440877,-0.0997440877 L0.0997440877,7.80048659 C0.0997440877,8.90505609 0.995174588,9.80048659 2.09974409,9.80048659 L9.80048659,9.80048659 L9.80048659,9.80048659"
                        id="Path-3"
                        transform="translate(4.9501, 4.8504) rotate(90) translate(-4.9501, -4.8504)"
                      ></path>
                    </g>
                    <g
                      id="Group-10"
                      opacity="0.550000012"
                      transform="translate(2, 2)"
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <line
                        x1="7.5"
                        y1="14.5"
                        x2="7.5"
                        y2="0.5"
                        id="Line-2"
                      ></line>
                      <line
                        x1="7"
                        y1="14"
                        x2="7"
                        y2="1"
                        id="Line-2"
                        transform="translate(7, 7.5) rotate(90) translate(-7, -7.5)"
                      ></line>
                    </g>
                    <g
                      id="gear"
                      transform="translate(21.0876, 17.2796) rotate(-20) translate(-21.0876, -17.2796)translate(15.9634, 11.5127)"
                      stroke="#FFF"
                      strokeLinejoin="round"
                      strokeWidth="1.25"
                    >
                      <circle
                        id="Oval"
                        cx="5.12378058"
                        cy="5.76719178"
                        r="1.28158482"
                      ></circle>
                      <path
                        d="M6.21361819,0.80762797 L6.59086967,2.04907966 C6.72061095,2.47639719 7.15892721,2.73042581 7.59419808,2.63056421 L8.85259487,2.33893009 C9.34216301,2.22858155 9.84650092,2.45011894 10.0964357,2.88530436 C10.3463705,3.32048979 10.2835655,3.86774756 9.94154064,4.23499782 L9.06128718,5.18481538 C8.75980718,5.51248709 8.75980718,6.0165454 9.06128718,6.3442171 L9.94154064,7.29403466 C10.2835655,7.66128493 10.3463705,8.2085427 10.0964357,8.64372812 C9.84650092,9.07891354 9.34216301,9.30045094 8.85259487,9.1901024 L7.59419808,8.89846827 C7.15663131,8.79632613 6.71524652,9.05279063 6.58730228,9.48352022 L6.2100508,10.7249719 C6.0649735,11.2053044 5.62242271,11.5339347 5.12065911,11.5339347 C4.61889551,11.5339347 4.17634472,11.2053044 4.03126742,10.7249719 L3.65669148,9.48352022 C3.52807698,9.05567912 3.08963152,8.80095947 2.65425492,8.90114382 L1.39585813,9.19277794 C0.90628999,9.30312648 0.401952083,9.08158909 0.152017275,8.64640366 C-0.0979175321,8.21121824 -0.035112502,7.66396047 0.306912358,7.29671021 L1.18716582,6.34689264 C1.48864582,6.01922094 1.48864582,5.51516263 1.18716582,5.18749093 L0.306912358,4.23767336 C-0.035112502,3.8704231 -0.0979175321,3.32316533 0.152017275,2.88797991 C0.401952083,2.45279448 0.90628999,2.23125709 1.39585813,2.34160563 L2.65425492,2.63323975 C3.08937078,2.73350334 3.52770594,2.47923776 3.65669148,2.0517552 L4.03483481,0.810303513 C4.17932126,0.32979188 4.62146882,0.000617032116 5.12323309,0 C5.62499736,-0.000615299293 6.06795204,0.327472644 6.21361819,0.80762797 Z"
                        id="Path"
                      ></path>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Grid</h5>
            <p className="text-[12px] text-white/80">
              Click on the Grid button to change the screen configuration, please see below for more
              information.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="31"
                viewBox="0 0 32 31"
                fill="none"
                className="h-[28px] w-[28px]"
              >
                <path
                  d="M31.0335 12.0335C31.0335 12.0335 27.859 7.70821 25.28 5.12741C22.7009 2.54662 19.137 0.950195 15.2002 0.950195C7.33014 0.950195 0.950195 7.33014 0.950195 15.2002C0.950195 23.0703 7.33014 29.4502 15.2002 29.4502C21.6968 29.4502 27.1779 25.1028 28.8932 19.1585M31.0335 12.0335V2.53353M31.0335 12.0335H21.5335"
                  stroke="white"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Reset</h5>
            <p className="text-[12px] text-white/80">
              Reset case screen settings (Zoom, Window, Screen configuration)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="39"
                height="29"
                viewBox="0 0 39 29"
                fill="none"
              >
                <path
                  d="M13.5982 28.0856L5.17677 21.5751C3.80343 20.5127 2.81877 19.0551 2.33292 17.4227L2.28757 17.2542L0.862404 16.1983C0.208123 15.8485 0.221079 14.1966 0.881838 13.8662L2.37826 12.6677L2.44304 12.4799C2.85116 11.2749 3.54431 10.1736 4.47066 9.26671L13.5982 0.411133H15.9303C16.4032 0.411133 16.7854 0.793341 16.7854 1.26624V27.2305C16.7854 27.7034 16.4032 28.0856 15.9303 28.0856H13.5982Z"
                  fill="white"
                  fillOpacity="0.1"
                />
                <path
                  d="M13.9279 28.5C13.7789 28.5 13.6364 28.4547 13.5068 28.364L5.0854 22.145C3.60193 20.9983 2.53953 19.463 2.00186 17.688L0.803422 16.8005C0.200965 16.4378 -0.00633142 15.6474 0.000146603 15.0126C0.00662463 14.2158 0.311092 13.5744 0.816378 13.2764L2.09903 12.2529C2.55249 10.9314 3.31042 9.73291 4.30156 8.76767L13.4421 0.190645C13.7271 -0.074958 14.1741 -0.0620018 14.4461 0.223035C14.7117 0.508072 14.6988 0.955062 14.4138 1.22714L5.27974 9.79769C4.45703 10.601 3.8157 11.618 3.43998 12.7193L3.3169 13.1015L1.52896 14.5073C1.52896 14.5073 1.41883 14.7405 1.41883 15.0385C1.41883 15.3365 1.50305 15.5438 1.54839 15.5891L1.61965 15.6345L3.24564 16.8329L3.35576 17.2346C3.80275 18.7375 4.69672 20.0461 5.94697 21.0113L14.3555 27.2173C14.6729 27.4505 14.7377 27.8911 14.5044 28.2085C14.3684 28.3963 14.1482 28.4935 13.9344 28.4935L13.9279 28.5Z"
                  fill="white"
                />
                <path
                  d="M35.5064 28.0856L27.085 21.5751C25.7116 20.5127 24.727 19.0551 24.2411 17.4227L24.1958 17.2542L22.7706 16.1983C22.1163 15.8485 22.1293 14.1966 22.79 13.8662L24.2865 12.6677L24.3512 12.4799C24.7594 11.2749 25.4525 10.1736 26.3789 9.26671L35.5064 0.411133H37.8385C38.3114 0.411133 38.6936 0.793341 38.6936 1.26624V27.2305C38.6936 27.7034 38.3114 28.0856 37.8385 28.0856H35.5064Z"
                  fill="white"
                  fillOpacity="0.1"
                />
                <path
                  d="M35.8365 28.5C35.6875 28.5 35.545 28.4547 35.4154 28.364L26.994 22.145C25.5105 20.9983 24.4481 19.463 23.9105 17.688L22.712 16.8005C22.1096 16.4442 21.8958 15.6474 21.9088 15.019C21.9152 14.2222 22.2197 13.5809 22.725 13.2829L24.0076 12.2594C24.4611 10.9378 25.219 9.73938 26.2102 8.77415L35.3507 0.190645C35.6357 -0.074958 36.0827 -0.0620018 36.3548 0.223035C36.6204 0.508072 36.6074 0.955062 36.3224 1.22714L27.1883 9.79769C26.3656 10.601 25.7243 11.618 25.3486 12.7193L25.2255 13.1015L23.4376 14.5073C23.4376 14.5073 23.3274 14.7405 23.3274 15.0385C23.3274 15.3365 23.4117 15.5438 23.457 15.5891L23.5283 15.6345L25.1542 16.8329L25.2644 17.2346C25.7114 18.7375 26.6053 20.0461 27.8556 21.0113L36.2641 27.2173C36.5815 27.4505 36.6463 27.8911 36.4131 28.2085C36.277 28.3963 36.0568 28.4935 35.843 28.4935L35.8365 28.5Z"
                  fill="white"
                />
                <path
                  d="M28.9437 18.2324C28.5809 18.2324 28.257 18.1676 27.9785 18.0446C27.6934 17.9215 27.4732 17.7466 27.3112 17.5263C27.1493 17.3061 27.0651 17.0469 27.0586 16.7619H28.121C28.121 16.885 28.1663 16.9886 28.2441 17.0793C28.3153 17.17 28.419 17.2413 28.5421 17.2931C28.6651 17.3449 28.8012 17.3708 28.9567 17.3708C29.1121 17.3708 29.2611 17.3449 29.3842 17.2866C29.5073 17.2283 29.6045 17.1506 29.6757 17.0534C29.747 16.9562 29.7794 16.8396 29.7794 16.7036C29.7794 16.5675 29.7405 16.4509 29.6692 16.3473C29.598 16.2436 29.4879 16.1659 29.3518 16.1076C29.2158 16.0493 29.0538 16.0234 28.866 16.0234H28.3995V15.2525H28.866C29.0279 15.2525 29.164 15.2266 29.287 15.1683C29.4101 15.11 29.5073 15.0387 29.5721 14.9415C29.6368 14.8444 29.6757 14.7278 29.6757 14.5982C29.6757 14.4686 29.6433 14.365 29.585 14.2678C29.5267 14.1706 29.4425 14.0994 29.3389 14.0476C29.2352 13.9957 29.1121 13.9698 28.9696 13.9698C28.8271 13.9698 28.6975 13.9957 28.5809 14.0476C28.4643 14.0994 28.3672 14.1706 28.2959 14.2678C28.2246 14.365 28.1858 14.4686 28.1793 14.5982H27.1687C27.1687 14.3132 27.2529 14.0605 27.4149 13.8403C27.5704 13.62 27.7906 13.4516 28.0562 13.3285C28.3283 13.2054 28.6328 13.1406 28.9696 13.1406C29.3065 13.1406 29.6109 13.2054 29.8701 13.3285C30.1292 13.4516 30.33 13.62 30.4725 13.8338C30.615 14.0476 30.6863 14.2808 30.6863 14.5464C30.6863 14.8249 30.6021 15.0581 30.4272 15.246C30.2523 15.4339 30.0255 15.5505 29.747 15.6023V15.6412C30.1097 15.6865 30.3948 15.8161 30.5826 16.0234C30.777 16.2307 30.8677 16.4898 30.8677 16.7943C30.8677 17.0793 30.7899 17.332 30.6215 17.5522C30.4596 17.7725 30.2328 17.9474 29.9413 18.0705C29.6563 18.2 29.3259 18.2583 28.9502 18.2583L28.9437 18.2324Z"
                  fill="white"
                />
                <path
                  d="M33.4066 18.1607H31.6445V13.1855H33.426C33.9248 13.1855 34.3588 13.2827 34.7151 13.4835C35.0779 13.6844 35.3564 13.9694 35.5508 14.3387C35.7451 14.7079 35.8423 15.1549 35.8423 15.6667C35.8423 16.1784 35.7451 16.6319 35.5508 17.0012C35.3564 17.3704 35.0779 17.6619 34.7151 17.8563C34.3523 18.0506 33.9183 18.1543 33.413 18.1543L33.4066 18.1607ZM32.694 17.2603H33.3612C33.6722 17.2603 33.9313 17.202 34.145 17.0918C34.3588 16.9817 34.5208 16.8068 34.6244 16.5736C34.7346 16.3404 34.7864 16.0359 34.7864 15.6667C34.7864 15.2974 34.7346 14.9994 34.6244 14.7662C34.5143 14.533 34.3588 14.3646 34.145 14.2544C33.9313 14.1443 33.6722 14.086 33.3612 14.086H32.694V17.2603Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Hanging Protocol</h5>
            <p className="text-[12px] text-white/80">
              Change the hanging protocol for the case (will also show more options when priors are
              available)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                width="28px"
                height="28px"
                viewBox="0 0 28 28"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                className="h-[28px] w-[28px]"
              >
                <g
                  id="tool-invert"
                  stroke="none"
                  strokeWidth="1"
                  fill="none"
                  fillRule="evenodd"
                >
                  <rect
                    id="Rectangle"
                    x="0"
                    y="0"
                    width="28"
                    height="28"
                  ></rect>
                  <rect
                    id="Rectangle"
                    stroke="white"
                    strokeWidth="1.5"
                    x="4"
                    y="5"
                    width="20"
                    height="18"
                    rx="2"
                  ></rect>
                  <path
                    d="M14,23 L6,23 C4.8954305,23 4,22.1045695 4,21 L4,7 C4,5.8954305 4.8954305,5 6,5 L14,5 L14,8 C10.6862915,8 8,10.6862915 8,14 C8,17.3137085 10.6862915,20 14,20 L14,23 Z"
                    id="Combined-Shape"
                    fill="white"
                  ></path>
                  <path
                    d="M14,8 C17.3137085,8 20,10.6862915 20,14 C20,17.3137085 17.3137085,20 14,20 Z"
                    id="Combined-Shape"
                    fill="white"
                  ></path>
                </g>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Invert</h5>
            <p className="text-[12px] text-white/80">Invert image.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 pb-10">
        <p className="text-primary-light text-xl font-bold leading-tight">Bottom Bar</p>
        <div className="flex items-center justify-between self-stretch rounded-[16px] border border-white/30 px-4 py-2">
          <img
            className="w-full"
            src="assets/bottom-grp.png"
            alt="OHIF"
          />
        </div>
      </div>
      <div className="pb-p mb-12 grid gap-10 border-b border-white/10 pb-6">
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 25 25"
                fill="none"
              >
                <path
                  d="M12.4997 21.875L12.3955 21.7187C11.6719 20.6333 11.3101 20.0906 10.8321 19.6977C10.4089 19.3499 9.92131 19.089 9.39718 18.9298C8.80514 18.75 8.15291 18.75 6.84845 18.75H5.41634C4.24957 18.75 3.66618 18.75 3.22053 18.5229C2.82852 18.3232 2.50981 18.0045 2.31008 17.6125C2.08301 17.1668 2.08301 16.5834 2.08301 15.4167V6.45833C2.08301 5.29156 2.08301 4.70817 2.31008 4.26252C2.50981 3.87052 2.82852 3.55181 3.22053 3.35207C3.66618 3.125 4.24957 3.125 5.41634 3.125H5.83301C8.16656 3.125 9.33334 3.125 10.2246 3.57914C11.0086 3.97861 11.6461 4.61603 12.0455 5.40004C12.4997 6.29134 12.4997 7.45811 12.4997 9.79167M12.4997 21.875V9.79167M12.4997 21.875L12.6039 21.7187C13.3275 20.6333 13.6893 20.0906 14.1673 19.6977C14.5904 19.3499 15.078 19.089 15.6022 18.9298C16.1942 18.75 16.8464 18.75 18.1509 18.75H19.583C20.7498 18.75 21.3332 18.75 21.7788 18.5229C22.1708 18.3232 22.4895 18.0045 22.6893 17.6125C22.9163 17.1668 22.9163 16.5834 22.9163 15.4167V6.45833C22.9163 5.29156 22.9163 4.70817 22.6893 4.26252C22.4895 3.87052 22.1708 3.55181 21.7788 3.35207C21.3332 3.125 20.7498 3.125 19.583 3.125H19.1663C16.8328 3.125 15.666 3.125 14.7747 3.57914C13.9907 3.97861 13.3533 4.61603 12.9538 5.40004C12.4997 6.29134 12.4997 7.45811 12.4997 9.79167"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Instructions</h5>
            <p className="text-[12px] text-white/80">Opens this document.</p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="min-w-11 min-h-11 inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 25 25"
                fill="none"
              >
                <path
                  d="M12.4997 21.875L12.3955 21.7187C11.6719 20.6333 11.3101 20.0906 10.8321 19.6977C10.4089 19.3499 9.92131 19.089 9.39718 18.9298C8.80514 18.75 8.15291 18.75 6.84845 18.75H5.41634C4.24957 18.75 3.66618 18.75 3.22053 18.5229C2.82852 18.3232 2.50981 18.0045 2.31008 17.6125C2.08301 17.1668 2.08301 16.5834 2.08301 15.4167V6.45833C2.08301 5.29156 2.08301 4.70817 2.31008 4.26252C2.50981 3.87052 2.82852 3.55181 3.22053 3.35207C3.66618 3.125 4.24957 3.125 5.41634 3.125H5.83301C8.16656 3.125 9.33334 3.125 10.2246 3.57914C11.0086 3.97861 11.6461 4.61603 12.0455 5.40004C12.4997 6.29134 12.4997 7.45811 12.4997 9.79167M12.4997 21.875V9.79167M12.4997 21.875L12.6039 21.7187C13.3275 20.6333 13.6893 20.0906 14.1673 19.6977C14.5904 19.3499 15.078 19.089 15.6022 18.9298C16.1942 18.75 16.8464 18.75 18.1509 18.75H19.583C20.7498 18.75 21.3332 18.75 21.7788 18.5229C22.1708 18.3232 22.4895 18.0045 22.6893 17.6125C22.9163 17.1668 22.9163 16.5834 22.9163 15.4167V6.45833C22.9163 5.29156 22.9163 4.70817 22.6893 4.26252C22.4895 3.87052 22.1708 3.55181 21.7788 3.35207C21.3332 3.125 20.7498 3.125 19.583 3.125H19.1663C16.8328 3.125 15.666 3.125 14.7747 3.57914C13.9907 3.97861 13.3533 4.61603 12.9538 5.40004C12.4997 6.29134 12.4997 7.45811 12.4997 9.79167"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Submit your answers</h5>
            <p className="text-[12px] text-white/80">
              When you reach the last case , will appear on the tool bar. Click to submit your
              answers and receive immediate feedback on your performance.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InstructionModal;

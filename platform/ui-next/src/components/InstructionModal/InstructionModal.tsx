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
            <div className="inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
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
              Open by default, you can hide by clicking on the series icon. Lorem Ipsum is simply
              dummy text of the printing and typesetting industry. Lorem Ipsum has been the
              industry's standard dummy text ever since the 1500s, 
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
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
              Open by default, you can hide by clicking on the series icon. Lorem Ipsum is simply
              dummy text of the printing and typesetting industry. Lorem Ipsum has been the
              industry's standard dummy text ever since the 1500s, 
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[64px_1fr] items-start gap-4">
          <div className="inline-flex w-auto">
            <div className="inline-flex items-center justify-center gap-[6px] rounded-[6px] bg-white/10 p-[6px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="29"
                height="29"
                viewBox="0 0 29 29"
                fill="none"
              >
                <path
                  d="M5.9375 10.6875L2.375 14.25M2.375 14.25L5.9375 17.8125M2.375 14.25H26.125M10.6875 5.9375L14.25 2.375M14.25 2.375L17.8125 5.9375M14.25 2.375V26.125M17.8125 22.5625L14.25 26.125M14.25 26.125L10.6875 22.5625M22.5625 10.6875L26.125 14.25M26.125 14.25L22.5625 17.8125"
                  stroke="white"
                  strokeWidth="1.58333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="grid gap-1">
            <h5 className="text-lg font-semibold text-white">Series Window</h5>
            <p className="text-[12px] text-white/80">
              Open by default, you can hide by clicking on the series icon. Lorem Ipsum is simply
              dummy text of the printing and typesetting industry. Lorem Ipsum has been the
              industry's standard dummy text ever since the 1500s, 
            </p>
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
    </Modal>
  );
};

export default InstructionModal;

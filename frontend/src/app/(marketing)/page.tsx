export default function HomePage() {
  return (
    <section className="pb-[113px] md:pb-[73px] lg:pb-[113px] pt-[60px] md:pt-[100px] xl:pt-[126px]">
      <div className="mx-auto px-[8.33%] md:px-[25px] xl:max-w-[1200px]">
        <div className="flex flex-col justify-center relative gap-[30px] my-[50px] mb-[32px] md:flex-row md:items-center md:my-[60px] md:mb-0 lg:my-[100px] lg:mb-[36px] xl:my-[105px] xl:mb-[76px] w-full">

          {/* Video Container */}
          <div className="w-[60%] mx-auto md:-ml-[1%] md:relative md:top-[-50px] md:w-[50%] lg:top-[-80px] lg:w-[48%] xl:absolute xl:-left-[10%] xl:top-[-22%] xl:w-[60%]">
            <div className="relative">
              <div className="relative pt-[105.053%]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  src="/hero-bg.mp4"
                  className="absolute top-0 left-0 w-full h-full object-cover"
                ></video>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <h1 className="flex-1 flex flex-col relative z-10 text-[60px] text-center items-center md:mt-[40px] md:-ml-[4%] md:max-w-[54%] md:text-[75px] md:items-start xl:mt-0 xl:text-[120px] xl:max-w-none xl:ml-[50%] w-full">
            <span className="flex items-baseline gap-[20px] leading-[1.05] font-bold font-space headline-gradient tracking-[-1px] max-w-max">Transparent</span>
            <span className="flex items-baseline gap-[20px] leading-[1.05] font-bold font-space headline-gradient tracking-[-1px] max-w-max">Secure</span>
            <span className="flex items-baseline gap-[20px] leading-[1.05] font-bold font-space headline-gradient tracking-[-1px] max-w-max">Community</span>
            <span className="flex items-baseline gap-[20px] leading-[1.05] font-bold font-space headline-gradient tracking-[-1px] max-w-max">
              Owned
              <svg className="w-[11px] h-[11px] pointer-events-none md:w-[17px] md:h-[18px] lg:w-[27px] lg:h-[28px]" viewBox="0 0 27 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="dotgrad" x1="50%" x2="50%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#681CFF" />
                    <stop offset="100%" stopColor="#FD3F83" />
                  </linearGradient>
                </defs>
                <g fill="url(#dotgrad)">
                  <path d="M15.48808,-2.27373675e-13 C13.32539,-2.27373675e-13 11.30154,0.448217 9.41865,1.346735 C7.53576,2.176457 5.89481,3.318889 4.4979,4.769861 C3.10309,6.222917 1.98808,7.915717 1.15077,9.850346 C0.38289,11.718264 0,13.688333 0,15.762639 C0,17.422083 0.31346,19.012732 0.9425,20.532499 C1.56942,21.985556 2.40673,23.263495 3.45442,24.370486 C4.56942,25.477477 5.86115,26.340555 7.32539,26.961805 C8.78962,27.653935 10.36115,28 12.03366,28 C14.0575,28 15.97405,27.551783 17.79173,26.65118 C19.60729,25.821458 21.17672,24.681111 22.5021,23.228055 C23.89481,21.708287 24.97616,19.980046 25.74404,18.045417 C26.58135,16.108704 27,14.069838 27,11.926737 C27,8.539051 25.91865,5.70382 23.75596,3.423126 C21.66269,1.140347 18.90673,-2.27373675e-13 15.48808,-2.27373675e-13 L15.48808,-2.27373675e-13 Z" />
                </g>
              </svg>
            </span>
            <div className="font-tenon block text-[20px] mt-[20px] leading-[1.6] md:text-[21px] md:leading-[1.4] lg:text-[25px] xl:text-[32px] xl:mt-[25px] xl:leading-[1.8] text-foreground font-normal">
              A Secure digital harbor for our shared community wealth.
            </div>
          </h1>

        </div>
      </div>
    </section>
  );
}

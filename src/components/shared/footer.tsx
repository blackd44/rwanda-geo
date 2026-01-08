export default function Footer() {
  return (
    <div className="pointer-events-none absolute bottom-0 z-1000 w-full">
      <div className="pointer-events-auto mx-auto flex w-fit flex-wrap items-center justify-center gap-1 rounded-lg rounded-b-none border border-white/10 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-400 backdrop-blur md:gap-2 md:px-4 md:py-1.5 md:text-xs">
        <span>© 2025</span>
        <a
          href="https://blackd44.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-300 transition-colors hover:text-orange-200"
        >
          blackd44
        </a>
        <span>•</span>
        <span>
          {/* <a
              href="https://geoportal.mininfra.gov.rw"
              target="_blank"
              rel="noopener noreferrer"
            > */}
          Data source: MININFRA Geoportal
          {/* </a> */}
        </span>
      </div>
    </div>
  );
}

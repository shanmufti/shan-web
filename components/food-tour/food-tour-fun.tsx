const PHOTO = "/food-tour/rubric.jpg";

/** Faint, slowly drifting wallpaper of the rubric photo behind the page. */
export function FoodTourBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="motion-safe:animate-drift pointer-events-none fixed -inset-1/4 -z-10 rotate-[-8deg] opacity-[0.07] dark:opacity-[0.1]"
      style={{
        backgroundImage: `url(${PHOTO})`,
        backgroundSize: "120px 160px",
        backgroundRepeat: "repeat",
      }}
    />
  );
}

/** Tilted polaroid of the rubric that wiggles. Opens the full photo. */
export function RubricSticker() {
  return (
    <a
      href={PHOTO}
      target="_blank"
      rel="noreferrer"
      title="Behold: the rubric"
      className="motion-safe:animate-wiggle relative z-10 float-right mt-20 ml-4 block w-24 rotate-6 rounded-sm bg-white p-1.5 pb-5 shadow-lg ring-1 ring-black/5 transition-transform hover:scale-110 sm:mt-24 sm:w-36 sm:p-2 sm:pb-7"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PHOTO}
        alt="The food tour rubric sign above its biggest fan."
        className="aspect-[3/4] w-full object-cover"
      />
      <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[0.6rem] whitespace-nowrap text-neutral-500 sm:bottom-1.5 sm:text-[0.7rem]">
        <span className="hidden sm:inline">the rubric ✦ </span>obey
      </span>
    </a>
  );
}

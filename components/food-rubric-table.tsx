import { RUBRIC_BANDS, RUBRIC_CATEGORIES } from "@/lib/food-rubric";

/** The full rubric, folded away; the form already shows it per category. */
export function FoodRubricTable() {
  return (
    <details className="group mb-10">
      <summary className="meta-label text-muted-foreground hover:text-foreground -my-2 cursor-pointer list-none py-3">
        <span className="inline-block transition-transform group-open:rotate-90">
          ▸
        </span>{" "}
        Food tour evaluation rubric
      </summary>
      <div className="border-border mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Category
              </th>
              {RUBRIC_BANDS.map((band) => (
                <th
                  key={band.key}
                  scope="col"
                  className="px-3 py-2.5 text-center font-semibold"
                >
                  {band.label}
                  <span className="text-muted-foreground block font-mono text-xs font-normal">
                    {band.min}–{band.max} pts
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RUBRIC_CATEGORIES.map((category) => (
              <tr key={category.key} className="border-border border-t">
                <th
                  scope="row"
                  className="px-3 py-2.5 align-top font-semibold whitespace-nowrap"
                >
                  {category.label}
                </th>
                {RUBRIC_BANDS.map((band) => (
                  <td
                    key={band.key}
                    className="text-muted-foreground px-3 py-2.5 text-center align-top leading-snug"
                  >
                    {category.descriptions[band.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

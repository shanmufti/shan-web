import { Picture } from "@/components/picture";
import { mediaImage } from "@/lib/media";

interface PhotoRow {
  id?: string | null;
  image?: unknown;
  stop?: string | null;
}

interface Group {
  stop: string | null;
  photos: { key: string; row: PhotoRow }[];
}

/** Rows grouped by stop, groups in first-appearance order. */
function groupByStop(rows: PhotoRow[]): Group[] {
  const groups: Group[] = [];
  rows.forEach((row, i) => {
    const stop = row.stop?.trim() ? row.stop.trim() : null;
    let group = groups.find((g) => g.stop === stop);
    if (!group) {
      group = { stop, photos: [] };
      groups.push(group);
    }
    group.photos.push({ key: row.id ?? String(i), row });
  });
  return groups;
}

function caption(image: unknown): string | undefined {
  if (!image || typeof image !== "object") return undefined;
  const value = (image as { caption?: unknown }).caption;
  return typeof value === "string" && value.trim() ? value : undefined;
}

function largeUrl(image: unknown): string | undefined {
  return mediaImage(image, "large")?.src;
}

/** A journey's photo gallery (travel.photos), grouped by stop. */
export function JourneyPhotos({
  photos,
}: Readonly<{ photos: PhotoRow[] | null | undefined }>) {
  const rows = (photos ?? []).filter((row) => mediaImage(row.image));
  if (rows.length === 0) return null;
  const groups = groupByStop(rows);
  const showStops = groups.some((g) => g.stop);

  return (
    <section aria-labelledby="photos" className="mt-16">
      <h2 id="photos" className="text-2xl font-medium tracking-[-0.03em]">
        Photos
      </h2>
      {groups.map((group) => (
        <div key={group.stop ?? "_"} className="mt-6">
          {showStops ? (
            <h3 className="meta-label text-muted-foreground mb-3">
              {group.stop ?? "More photos"}
            </h3>
          ) : null}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {group.photos.map(({ key, row }) => {
              const image = mediaImage(row.image, "card");
              if (!image) return null;
              const text = caption(row.image);
              return (
                <li key={key}>
                  <figure>
                    <a
                      href={largeUrl(row.image) ?? image.src}
                      target="_blank"
                      rel="noopener"
                      className="block overflow-hidden rounded-xl"
                    >
                      <Picture
                        image={image}
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                      />
                    </a>
                    {text ? (
                      <figcaption className="text-muted-foreground mt-1.5 text-sm">
                        {text}
                      </figcaption>
                    ) : null}
                  </figure>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

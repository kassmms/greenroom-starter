import { getAllShows, getAllArtists } from "@/lib/queries";
import { formatShowDate, formatMoneyCompact } from "@/lib/format";
import {
  CommandPalette,
  type ShowEntry,
  type ArtistEntry,
} from "./command-palette";

const dealLabels: Record<string, string> = {
  flat: "Flat",
  percentage_of_gross: "% of gross",
  percentage_of_net: "% of net",
  vs: "Vs deal",
  door: "Door deal",
};

/**
 * Server component that fetches a lightweight search index of all shows
 * and artists, pre-formats display strings (to avoid Intl hydration
 * mismatches), and passes the data to the client-side CommandPalette.
 */
export async function CommandPaletteData() {
  const [showRows, artistRows] = await Promise.all([
    getAllShows(),
    getAllArtists(),
  ]);

  const shows: ShowEntry[] = showRows.map(({ show, artist, deal }) => ({
    id: show.id,
    artistName: artist?.name ?? "Unknown Artist",
    dateFormatted: formatShowDate(show.date),
    dealType: deal ? (dealLabels[deal.dealType] ?? deal.dealType) : null,
    guaranteeFormatted:
      deal?.guaranteeAmount != null
        ? formatMoneyCompact(deal.guaranteeAmount)
        : null,
  }));

  const artists: ArtistEntry[] = artistRows.map(({ artist, showCount }) => ({
    name: artist.name,
    genre: artist.genre,
    showCount: Number(showCount),
  }));

  return <CommandPalette shows={shows} artists={artists} />;
}

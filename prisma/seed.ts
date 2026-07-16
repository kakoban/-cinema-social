// Seed: create demo admin user + a few demo movies + demo watchlist
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const adminEmail = "admin@cinema.dev";
  let admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        username: "admin",
        email: adminEmail,
        password: await hashPassword("admin123"),
        role: "ADMIN",
        bio: "Cinema Social administrator",
      },
    });
    console.log("Created admin:", admin.username);
  } else {
    console.log("Admin already exists");
  }

  // a demo user
  const demoEmail = "cinephile@cinema.dev";
  let demo = await db.user.findUnique({ where: { email: demoEmail } });
  if (!demo) {
    demo = await db.user.create({
      data: {
        username: "cinephile",
        email: demoEmail,
        password: await hashPassword("demo123"),
        bio: "Lover of classic and cult cinema.",
      },
    });
    console.log("Created demo user:", demo.username);
  }

  // a couple demo archive movies (so homepage has content even without TMDB key)
  const demoFilms = [
    {
      title: "Night of the Living Dead",
      archiveId: "night-of-the-living-dead-1968-by-george-a.-romero",
      year: 1968,
      description:
        "A group of people hide from bloodthirsty zombies in a farmhouse. George A. Romero's genre-defining horror classic — public domain.",
      genre: "Horror / Classic",
    },
    {
      title: "Nosferatu",
      archiveId: "nosferatu-1922-colorized",
      year: 1922,
      description:
        "A real-estate agent travels to the Carpathian Mountains to meet the eerie Count Orlok. F.W. Murnau's silent vampire masterpiece.",
      genre: "Silent / Horror",
    },
    {
      title: "The General",
      archiveId: "TheGeneral1926",
      year: 1926,
      description:
        "A Southern railroad engineer pursues his stolen locomotive and the woman he loves during the American Civil War. Buster Keaton's comedic gem.",
      genre: "Silent / Comedy",
    },
    {
      title: "A Trip to the Moon",
      archiveId: "le-voyage-dans-la-lune-1902-georges-melies",
      year: 1902,
      description:
        "Astronomers travel to the Moon in a bullet-shaped capsule. Georges Méliès's pioneering science-fiction adventure.",
      genre: "Silent / Sci-Fi",
    },
  ];

  // Clean up any stale ARCHIVE movies from a previous (invalid-identifier) seed
  await db.movie.deleteMany({ where: { source: "ARCHIVE" } });

  const { archiveDetail, pickBestVideoFile } = await import("../src/lib/archive");
  for (const f of demoFilms) {
    // resolve a direct video URL for synced playback in rooms
    const detail = await archiveDetail(f.archiveId);
    const directUrl = detail ? pickBestVideoFile(detail) : `https://archive.org/embed/${f.archiveId}`;
    const videoUrl = directUrl || `https://archive.org/embed/${f.archiveId}`;
    const existing = await db.movie.findFirst({ where: { archiveId: f.archiveId } });
    if (!existing) {
      await db.movie.create({
        data: {
          title: f.title,
          archiveId: f.archiveId,
          poster: `https://archive.org/services/img/${f.archiveId}`,
          backdrop: `https://archive.org/services/img/${f.archiveId}`,
          description: f.description,
          year: f.year,
          genre: f.genre,
          source: "ARCHIVE",
          videoUrl,
        },
      });
      console.log("Created movie:", f.title);
    } else if (!existing.videoUrl || existing.videoUrl.includes("/embed/")) {
      await db.movie.update({ where: { id: existing.id }, data: { videoUrl } });
      console.log("Updated movie URL:", f.title);
    }
  }

  // demo review + watchlist for the demo user
  const notld = await db.movie.findFirst({
    where: { archiveId: "NightOfTheLivingDead_1968" },
  });
  if (notld && demo) {
    const reviewExists = await db.review.findUnique({
      where: { userId_movieId: { userId: demo.id, movieId: notld.id } },
    });
    if (!reviewExists) {
      await db.review.create({
        data: {
          userId: demo.id,
          movieId: notld.id,
          rating: 9,
          content:
            "Still terrifying after all these decades. The grainy black-and-white photography and claustrophobic farmhouse setting make this a masterclass in dread.",
        },
      });
    }
    const listExists = await db.watchlist.findFirst({
      where: { userId: demo.id, name: "Classic Horror" },
    });
    if (!listExists) {
      const list = await db.watchlist.create({
        data: { name: "Classic Horror", userId: demo.id, isPublic: true },
      });
      await db.watchlistItem.create({
        data: { watchlistId: list.id, movieId: notld.id },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

import React from "react";

// ----------------------------------------------------------------------
// Firebase Storage base path (same pattern as Hotspots/Documents pages)
// ----------------------------------------------------------------------
const STORAGE_BASE =
  "https://storage.googleapis.com/mycalinan.firebasestorage.app/History";

// Helper: builds the full public URL for a filename in the History
// folder, URL-encoding spaces/special characters as needed.
function img(filename: string): string {
  return `${STORAGE_BASE}/${encodeURIComponent(filename)}`;
}

const HistoryPage: React.FC = () => {
  return (
    <div className="history-page">
      {/* HEADER */}
      <header className="history-header">
        {/* HOME OUTSIDE */}
        <a href="/" className="history-back">
          Home
        </a>

        <div className="header-overlay">
          <h1>History of Calinan</h1>
          <p>
            Stories, Heritage, and Historical Landmarks of Calinan
          </p>
        </div>
      </header>

      <main className="history-wrapper">

        {/* BEFORE COLONIAL PERIOD */}
        <section className="headline-frame">
          <div className="headline-text">
            <span className="mini-title">
              CALINAN HERITAGE TIMES
            </span>

            <h2>Before Colonial Period</h2>

            <div className="headline-image-1">
              <img
                src={img("Before Colonial Period1.jpg")}
                alt="Before Colonial Period"
              />

              <img
                src={img("Before Colonial Period2.png")}
                alt="Before Colonial Period"
              />
            </div>

            <p className="history-paragraph">
              Before the arrival of Spanish and American influences, the area
              now known as Calinan Poblacion was a vast wilderness of forests,
              rivers, and fertile lands inhabited by indigenous communities,
              particularly the Bagobo people. There was no formal town center
              or “Poblacion” yet; instead, families lived in scattered
              settlements surrounded by nature. They depended on farming,
              hunting, fishing, and the resources provided by the land.
              <br />
              <br />
              The community was led by tribal leaders such as Datu Abeng, who
              guided the people in their traditions and daily activities. The
              name Calinan is believed to have originated from the Bagobo word
              “Kolina,” meaning “a stream with clear running water,” referring
              to a nearby water source connected to the Talomo River. This
              stream became an important part of the community’s everyday life
              and symbolized the natural richness of the area.
            </p>
          </div>
        </section>

        {/* EARLY SETTLEMENT */}
        <section className="headline-frame">
          <div className="headline-text">
            <h2>Early Settlement and Community Formation</h2>

            <div className="headline-image-2">
              <img
                src={img("Lt. Cipriano Villafuerte Sr..png")}
                alt="Lt. Cipriano Villafuerte Sr."
              />

              <img
                src={img("Paulino Naraval.png")}
                alt="Paulino Naraval"
              />
            </div>

            <p>
              In the early 1900s, Calinan was still a small tribal settlement
              with no established town structure. The arrival of early settlers
              slowly introduced changes that shaped the growth of the
              community. In 1916, Paulino Naraval, a public school teacher
              from Luzon, became one of the first Christian settlers and helped
              introduce formal education in the area.
              <br />
              <br />
              A significant period of development began when Lt. Cipriano
              Villafuerte Sr. arrived in Calinan in 1920. Through his efforts,
              local communities were encouraged to build roads and bridges,
              establish schools, improve farming practices, and create
              connections between settlements. His leadership helped unite the
              indigenous communities and early settlers, laying the foundation
              for Calinan’s future growth.
            </p>
          </div>
        </section>

        {/* GROWTH OF CALINAN */}
        <section className="headline-frame">
          <div className="headline-text">
            <h2>Growth of Calinan as a Community</h2>

            <div className="headline-image-1">
              <img
                src={img("Growth-1.png")}
                alt="Growth of Calinan"
              />

              <img
                src={img("Growth-2.png")}
                alt="Growth of Calinan"
              />
            </div>

            <p>
              Calinan began to develop into a growing settlement when
              businesses and new residents started arriving. In 1927, the
              establishment of the first sari-sari store marked the beginning
              of local commerce. The completion of the Davao-Malagos Provincial
              Road in 1930 became a major turning point, allowing easier
              transportation and encouraging more families, traders, and
              investors to settle in the area.
              <br />
              <br />
              Agriculture became the heart of Calinan’s economy, with abaca
              plantations and farming activities becoming important sources of
              livelihood. The arrival of Filipino, Chinese, and Japanese
              settlers contributed to the expansion of businesses, trade, and
              community services.
            </p>
          </div>
        </section>

        {/* CHALLENGES AND REBUILDING */}
        <section className="headline-frame">
          <div className="headline-text">
            <h2>Challenges and Rebuilding After the War</h2>

            <div className="headline-image-1">
              <img
                src={img("Challenges-1.png")}
                alt="Challenges and Rebuilding After the War"
              />

              <img
                src={img("Challenges-2.png")}
                alt="Challenges and Rebuilding After the War"
              />
            </div>

            <p>
              During World War II, Calinan experienced hardships as it became
              affected by the conflict. However, after the war, the community
              slowly recovered as more families settled permanently and helped
              rebuild its economy. Schools, churches, businesses, and
              agricultural industries were established, bringing new
              opportunities for the residents.
              <br />
              <br />
              The growth of agricultural companies and plantations further
              strengthened Calinan’s role as one of Davao City’s important
              agricultural districts. Its fertile lands continued to produce
              bananas, durians, rice, corn, and other tropical fruits that
              became part of its identity.
            </p>
          </div>
        </section>

        {/* CALINAN TODAY */}
        <section className="headline-frame">
          <div className="headline-text">
            <h2>Calinan Today</h2>

            <div className="headline-image-1">
              <img
                src={img("Calinan today1.jpg")}
                alt="Calinan Today"
              />

              <img
                src={img("Calinan today2.jpg")}
                alt="Calinan Today"
              />
            </div>

            <p>
              From a small Bagobo settlement surrounded by forests, Calinan
              has transformed into a progressive and developing community.
              Today, Calinan Poblacion serves as a center for commerce,
              education, tourism, and public services while continuing to
              preserve its cultural heritage and agricultural roots.
              <br />
              <br />
              The story of Calinan is a story of transformation—from the
              traditions of its indigenous ancestors to the efforts of early
              settlers and the determination of generations of residents who
              built the community. Its history reflects the unity, resilience,
              and continuous growth of the people who call Calinan home.
            </p>
          </div>
        </section>

        {/* NEWSPAPER GRID */}
        <section className="history-grid">

          <article className="news-card">
            <img
              src={img("Holy Cross Students (1953).jpg")}
              alt="Holy Cross Students (1953)"
            />
            <div className="news-content">
              <span>Holy Cross Students (1953)</span>
            </div>
          </article>

          <article className="news-card">
            <img
              src={img("Old  Calinan Building (1990s).jpg")}
              alt="Old Calinan Building (1990s)"
            />
            <div className="news-content">
              <span>Old Calinan Building (1990s)</span>
            </div>
          </article>

          <article className="news-card">
            <img
              src={img("Calinan Police Station (1970).jpg")}
              alt="Calinan Police Station (1970)"
            />
            <div className="news-content">
              <span>Calinan Police Station (1970)</span>
            </div>
          </article>

          <article className="news-card">
            <img
              src={img("Calinan Central Elemetary (1970).jpg")}
              alt="Calinan Central Elementary (1970)"
            />
            <div className="news-content">
              <span>Calinan Central Elemetary (1970)</span>
            </div>
          </article>

          <article className="news-card">
            <img
              src={img("Employees of Calinan District Hall (1954).jpg")}
              alt="Employees of Calinan District Hall (1954)"
            />
            <div className="news-content">
              <span>Employees of Calinan District Hall (1954)</span>
            </div>
          </article>

        </section>

        <br />
        <br />

        {/* 20TH CENTURY - PRESENT */}
        <section className="headline-frame">

          <div className="headline-text">
            <span className="mini-title">
              CALINAN HERITAGE TIMES
            </span>

            <h2>20th Century - Present</h2>

            <br />

            <h3>Botica Carina (2010)</h3>

            <p>
              During the 20th century, Calinan experienced major growth as
              roads, transportation, and migration connected the once-rural
              settlement more closely to Davao City and surrounding districts.
              The American colonial period brought improvements in public
              education, governance, and infrastructure, helping transform
              Calinan into an organized poblacion and trading center. New
              settlers from different parts of the Philippines arrived,
              bringing diverse languages, customs, and farming practices.
              Agriculture became the backbone of the local economy, with rice,
              corn, coconuts, fruits, and later cacao and coffee contributing
              to the area’s development.
            </p>

            <br />
          </div>

          <div className="headline-image">
            <img
              src={img("Botica Carina (2010).jpg")}
              alt="Botica Carina (2010)"
            />
          </div>

          <div className="headline-text">
            <h3>Sacred Heart Parish of Calinan (2012)</h3>

            <p>
              In the mid-20th century, Calinan continued to progress through
              the establishment of schools, churches, markets, and public
              institutions. Educational centers such as Holy Cross College of
              Calinan helped provide learning opportunities for local youth,
              while churches like the Most Sacred Heart of Jesus Parish became
              important spiritual and social centers. The poblacion gradually
              became a busy community hub where people from nearby barangays
              came to trade goods, attend classes, seek services, and
              participate in religious fiestas and civic celebrations.
            </p>
          </div>

          <div className="headline-image">
            <img
              src={img("Sacred Heart Parish of Calinan (2012).jpg")}
              alt="Sacred Heart Parish of Calinan (2012)"
            />
          </div>

          <div className="headline-text">
            <h3>Calinan Police Station Inauguration (2013)</h3>

            <p>
              From the late 20th century to the present, Calinan has grown
              into one of the key districts of Davao City, balancing urban
              development with its agricultural roots. Modern roads, banks,
              hospitals, schools, convenience stores, and commercial centers
              now serve its expanding population. Calinan is especially known
              for its fruit production, fertile lands, and reputation as part
              of Davao’s cacao and durian-producing region. Despite
              modernization, the community still preserves its close-knit
              identity, local traditions, and role as a gateway to upland areas
              and neighboring municipalities.
            </p>
          </div>

          <div className="headline-image">
            <img
              src={img("Calinan Police Station Inauguration (2013).jpg")}
              alt="Calinan Police Station Inauguration (2013)"
            />
          </div>

          <div className="headline-text">
            <h3>Calinan Poblacion Signage (2019)</h3>

            <p>
              From the 20th century to the present, Calinan transformed from a
              growing rural settlement into a progressive district center.
              Through education, agriculture, migration, and infrastructure
              development, it became an important part of Davao City. Today,
              Calinan continues to advance while maintaining the heritage,
              culture, and community spirit that shaped its history.
            </p>
          </div>

          <div className="headline-image">
            <img
              src={img("Calinan Poblacion Signage (2019).jpg")}
              alt="Calinan Poblacion Signage (2019)"
            />
          </div>

        </section>

      </main>
    </div>
  );
};

export default HistoryPage;
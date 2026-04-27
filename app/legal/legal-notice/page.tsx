export const metadata = {
  title: "Mentions Légales — Steady",
};

export default function LegalNoticePage() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Mentions Légales</h1>
      <p className="text-slate-500 text-sm mb-8">Conformément à l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN)</p>

      <Section title="Éditeur du site">
        <Row label="Nom / Dénomination sociale" value="SIGMA" />
        <Row label="Forme juridique" value="Micro-entreprise" />
        <Row label="Siège social" value="190 rue sainte marie app 6, 97400 Saint-Denis" />
        <Row label="SIRET" value="en cours d'immatriculation" />
        <Row label="Email de contact" value="[email — à remplir]" />
      </Section>

      <Section title="Directeur de la publication">
        <Row label="Nom" value="Techer Clément" />
        <Row label="Email" value="[email — à remplir]" />
      </Section>

      <Section title="Hébergement de l'application">
        <Row label="Société" value="Vercel Inc." />
        <Row label="Adresse" value="340 Pine Street, Suite 900, San Francisco, CA 94104, États-Unis" />
        <Row label="Site web" value="vercel.com" />
      </Section>

      <Section title="Hébergement des données">
        <Row label="Société" value="Supabase Inc." />
        <Row label="Région" value="Europe (Frankfurt, Allemagne) — AWS eu-central-1" />
        <Row label="Site web" value="supabase.com" />
      </Section>

      <Section title="Source des données">
        <p>
          Les données de trading affichées par Steady proviennent exclusivement de l&apos;API publique
          de l&apos;exchange décentralisé Hyperliquid, accessible en lecture seule. Steady n&apos;est pas
          affilié à Hyperliquid Labs ni à aucune entité du protocole Hyperliquid.
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L&apos;ensemble du contenu de ce site (code source, design, algorithmes, textes) est protégé
          par le droit de la propriété intellectuelle et appartient à l&apos;Éditeur, sauf mention
          contraire. Toute reproduction sans autorisation écrite préalable est strictement interdite.
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Pour toute question relative au traitement de vos données personnelles, veuillez consulter
          notre{" "}
          <a href="/legal/privacy" className="text-slate-300 hover:text-white underline">
            Politique de Confidentialité
          </a>
          .
        </p>
      </Section>

      <Section title="Médiation de la consommation">
        <p>
          Conformément à l&apos;article L.616-1 du Code de la consommation, en cas de litige
          non résolu avec l&apos;Éditeur, vous pouvez recourir gratuitement à un médiateur de la
          consommation. La Commission Européenne met à disposition une plateforme de règlement
          en ligne des litiges accessible à l&apos;adresse : ec.europa.eu/consumers/odr
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-200 mb-3">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 min-w-[180px] shrink-0">{label} :</span>
      <span className={value.startsWith("[") ? "text-amber-400/70 italic" : "text-slate-300"}>
        {value}
      </span>
    </div>
  );
}

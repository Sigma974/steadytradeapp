export const metadata = {
  title: "Politique de Confidentialité — Steady",
};

export default function PrivacyPage() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Politique de Confidentialité</h1>
      <p className="text-slate-500 text-sm mb-8">Dernière mise à jour : 27 avril 2026 — Conforme au RGPD</p>

      <Section title="1. Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées via le Service Steady est :
        </p>
        <p className="bg-slate-800/50 rounded-lg p-3 font-mono text-xs">
          SIGMA — Micro-entreprise<br />
          190 rue sainte marie app 6, 97400 Saint-Denis<br />
          <span className="text-amber-400/70 italic">[email — à remplir]</span>
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>Le Service collecte un nombre minimal de données :</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700">
              <th className="pb-2 pr-4">Donnée</th>
              <th className="pb-2 pr-4">Finalité</th>
              <th className="pb-2 pr-4">Base légale</th>
              <th className="pb-2">Durée</th>
            </tr>
          </thead>
          <tbody className="text-slate-400">
            <tr className="border-b border-slate-800">
              <td className="py-2 pr-4">Adresse de portefeuille (pseudonyme)</td>
              <td className="py-2 pr-4">Récupération et affichage des analytics</td>
              <td className="py-2 pr-4">Exécution du service</td>
              <td className="py-2">5 minutes (cache)</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-2 pr-4">Adresse IP</td>
              <td className="py-2 pr-4">Limitation des abus (rate limiting)</td>
              <td className="py-2 pr-4">Intérêt légitime</td>
              <td className="py-2">1 heure</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Email (optionnel, si fourni)</td>
              <td className="py-2 pr-4">Support et notifications</td>
              <td className="py-2 pr-4">Consentement</td>
              <td className="py-2">Jusqu&apos;à retrait du consentement</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3">
          <strong className="text-slate-300">Important :</strong> l&apos;adresse de portefeuille est une
          donnée pseudonyme publique sur la blockchain. Le Service n&apos;a accès à aucune clé privée
          et ne peut effectuer aucune transaction.
        </p>
      </Section>

      <Section title="3. Sous-traitants et transferts">
        <p>Les données sont hébergées auprès des sous-traitants suivants :</p>
        <ul>
          <li>
            <strong className="text-slate-300">Supabase Inc.</strong> (base de données) — hébergement en
            Union Européenne (Frankfurt). Contrat de sous-traitance conforme au RGPD.
          </li>
          <li>
            <strong className="text-slate-300">Vercel Inc.</strong> (hébergement de l&apos;application) —
            siège aux États-Unis, transfert encadré par les clauses contractuelles types (CCT) de la
            Commission européenne.
          </li>
          <li>
            <strong className="text-slate-300">Hyperliquid</strong> (source de données) — API publique
            en lecture seule. Aucune donnée personnelle n&apos;est transmise à Hyperliquid.
          </li>
        </ul>
        <p>Aucune donnée n&apos;est vendue, louée ou partagée avec des tiers à des fins commerciales.</p>
      </Section>

      <Section title="4. Vos droits (RGPD)">
        <p>Conformément au Règlement (UE) 2016/679, vous disposez des droits suivants :</p>
        <ul>
          <li><strong className="text-slate-300">Droit d&apos;accès</strong> — obtenir une copie de vos données.</li>
          <li><strong className="text-slate-300">Droit de rectification</strong> — corriger des données inexactes.</li>
          <li><strong className="text-slate-300">Droit à l&apos;effacement</strong> — demander la suppression de vos données.</li>
          <li><strong className="text-slate-300">Droit à la portabilité</strong> — recevoir vos données dans un format structuré.</li>
          <li><strong className="text-slate-300">Droit d&apos;opposition</strong> — vous opposer à un traitement fondé sur l&apos;intérêt légitime.</li>
          <li><strong className="text-slate-300">Droit à la limitation</strong> — limiter le traitement de vos données.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez : <span className="text-amber-400/70 italic">[email — à remplir]</span>.
          Nous répondrons dans un délai maximum de 30 jours.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la{" "}
          <strong className="text-slate-300">CNIL</strong> (Commission Nationale de l&apos;Informatique
          et des Libertés) : <span className="text-slate-300">www.cnil.fr</span>.
        </p>
      </Section>

      <Section title="5. Cookies et traceurs">
        <p>
          Le Service n&apos;utilise pas de cookies de traçage, de publicité ou d&apos;analytics tiers.
          Des cookies strictement nécessaires au fonctionnement technique (session, sécurité) peuvent
          être utilisés sans consentement préalable conformément à l&apos;exemption CNIL.
        </p>
      </Section>

      <Section title="6. Sécurité">
        <p>
          L&apos;Éditeur met en œuvre des mesures techniques et organisationnelles appropriées pour
          protéger les données contre tout accès non autorisé, perte ou altération : chiffrement
          en transit (HTTPS/TLS), accès restreint aux bases de données via clés de service,
          limitation des requêtes par adresse IP.
        </p>
      </Section>

      <Section title="7. Modifications">
        <p>
          Cette politique peut être mise à jour. En cas de modification substantielle, une notification
          sera affichée sur le Service. La date de dernière mise à jour figure en haut de cette page.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-200 mb-3">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export const metadata = {
  title: "Disclaimer — Steady",
};

export default function DisclaimerPage() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Disclaimer</h1>
      <p className="text-slate-500 text-sm mb-8">Dernière mise à jour : 27 avril 2026</p>

      {/* Prominent warning */}
      <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-4 mb-8">
        <p className="text-amber-400 font-semibold text-sm mb-1">⚠ Avertissement important</p>
        <p className="text-amber-300/80 text-sm leading-relaxed">
          Steady n&apos;est pas un service de conseil en investissement. Les informations présentées
          sont fournies à titre purement informatif et analytique. Elles ne constituent pas,
          et ne doivent pas être interprétées comme, des recommandations d&apos;achat, de vente
          ou de conservation d&apos;actifs numériques.
        </p>
      </div>

      <Section title="1. Pas de conseil en investissement">
        <p>
          Steady est un outil d&apos;analytics qui affiche des statistiques de trading dérivées
          des données publiques de l&apos;exchange décentralisé Hyperliquid. Ces informations sont
          destinées à aider les traders à mieux comprendre leurs propres comportements de trading,
          et non à guider leurs décisions futures.
        </p>
        <p>
          L&apos;Éditeur n&apos;est pas un conseiller en investissement agréé, un gestionnaire de
          portefeuille, ni un prestataire de services en actifs numériques (PSAN) au sens de
          la réglementation française. Aucun contenu du Service ne doit être considéré comme
          un conseil personnalisé.
        </p>
      </Section>

      <Section title="2. Risques du trading de cryptoactifs">
        <p>
          Le trading de cryptoactifs, et en particulier le trading à effet de levier sur des
          plateformes telles qu&apos;Hyperliquid, comporte des risques élevés de perte en capital,
          pouvant aller jusqu&apos;à la perte totale des fonds engagés. Ces risques incluent
          notamment :
        </p>
        <ul>
          <li>la volatilité extrême des prix des cryptoactifs ;</li>
          <li>les risques liés à l&apos;utilisation de l&apos;effet de levier ;</li>
          <li>les risques de liquidation de positions ;</li>
          <li>les risques technologiques (smart contracts, bugs, hacks) ;</li>
          <li>les risques réglementaires selon le pays de résidence de l&apos;utilisateur ;</li>
          <li>les risques de contrepartie liés aux plateformes décentralisées.</li>
        </ul>
        <p>
          <strong className="text-slate-300">Vous êtes seul responsable de vos décisions de trading.</strong>{" "}
          Ne tradez jamais avec des fonds que vous ne pouvez pas vous permettre de perdre.
        </p>
      </Section>

      <Section title="3. Performances passées">
        <p>
          Les statistiques affichées par Steady (PnL réalisé, taux de réussite, durée des trades, etc.)
          reflètent des performances historiques. <strong className="text-slate-300">Les performances
          passées ne préjugent pas des performances futures</strong> et ne constituent pas une
          garantie de résultats similaires.
        </p>
      </Section>

      <Section title="4. Exactitude des données">
        <p>
          Les données affichées proviennent de l&apos;API publique d&apos;Hyperliquid. Bien que
          l&apos;Éditeur s&apos;efforce de traiter ces données avec rigueur (reconstruction des
          trades, calcul des insights), il ne garantit pas leur exactitude, exhaustivité ou
          mise à jour en temps réel.
        </p>
        <p>
          En cas de divergence entre les données affichées par Steady et celles disponibles
          directement sur Hyperliquid, les données d&apos;Hyperliquid font foi.
        </p>
      </Section>

      <Section title="5. Réglementation applicable">
        <p>
          L&apos;accès et l&apos;utilisation de plateformes de trading de cryptoactifs peuvent être
          soumis à des restrictions légales selon votre pays de résidence. Il vous appartient
          de vérifier la légalité de telles activités dans votre juridiction avant d&apos;utiliser
          ce service.
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

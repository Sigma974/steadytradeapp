export const metadata = {
  title: "Conditions Générales d'Utilisation — Steady",
};

export default function TermsPage() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Conditions Générales d&apos;Utilisation</h1>
      <p className="text-slate-500 text-sm mb-8">Dernière mise à jour : 27 avril 2026</p>

      <Section title="1. Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation
          du service Steady (ci-après « le Service »), plateforme d&apos;analytics destinée aux traders
          utilisant l&apos;exchange décentralisé Hyperliquid. Le Service est fourni par SIGMA, micro-entreprise
          (ci-après « l&apos;Éditeur »).
        </p>
      </Section>

      <Section title="2. Accès au Service">
        <p>
          Le Service est accessible gratuitement à toute personne disposant d&apos;une adresse de portefeuille
          compatible avec Hyperliquid. Aucune inscription, création de compte ou connexion de portefeuille
          (wallet connect) n&apos;est requise. L&apos;utilisateur saisit uniquement son adresse publique de
          portefeuille à des fins de consultation.
        </p>
        <p>
          L&apos;Éditeur se réserve le droit de modifier, suspendre ou interrompre le Service à tout moment,
          sans préavis ni indemnité.
        </p>
      </Section>

      <Section title="3. Nature du Service — Absence de conseil en investissement">
        <p className="font-semibold text-amber-400">
          Le Service Steady est un outil d&apos;analytics purement informatif. Il ne constitue en aucun cas
          un conseil en investissement, une recommandation d&apos;achat ou de vente d&apos;actifs numériques,
          ni une incitation à réaliser des opérations financières.
        </p>
        <p>
          Les données affichées (performances passées, statistiques de trading, comparaisons) sont
          fournies à titre indicatif uniquement. Les performances passées ne préjugent pas des
          performances futures. L&apos;utilisateur reste seul responsable de ses décisions de trading.
        </p>
        <p>
          Le Service ne dispose d&apos;aucun agrément d&apos;autorité de régulation financière (AMF, CySEC
          ou autre) et n&apos;est pas habilité à fournir des services d&apos;investissement au sens de la
          directive MIF II.
        </p>
      </Section>

      <Section title="4. Données utilisées">
        <p>
          Les données affichées proviennent exclusivement de l&apos;API publique d&apos;Hyperliquid, accessible
          en lecture seule. Le Service n&apos;a accès à aucune clé privée, ne peut réaliser aucune
          transaction et ne gère aucun actif pour le compte de l&apos;utilisateur.
        </p>
        <p>
          L&apos;exactitude, l&apos;exhaustivité et la mise à jour des données dépendent de l&apos;API tierce
          d&apos;Hyperliquid. L&apos;Éditeur ne garantit pas que les données sont complètes, exactes ou
          en temps réel.
        </p>
      </Section>

      <Section title="5. Responsabilités de l'utilisateur">
        <ul>
          <li>Utiliser le Service conformément aux lois applicables dans son pays de résidence.</li>
          <li>Ne pas tenter de contourner les mesures de limitation de débit (rate limiting).</li>
          <li>Ne pas utiliser le Service à des fins illicites ou frauduleuses.</li>
          <li>Vérifier la réglementation applicable au trading de cryptoactifs dans son pays.</li>
        </ul>
      </Section>

      <Section title="6. Limitation de responsabilité">
        <p>
          Dans les limites autorisées par la loi, l&apos;Éditeur ne saurait être tenu responsable :
        </p>
        <ul>
          <li>des pertes financières résultant de décisions prises sur la base des données affichées ;</li>
          <li>des interruptions, erreurs ou inexactitudes dans les données fournies par l&apos;API Hyperliquid ;</li>
          <li>de tout dommage indirect, consécutif ou immatériel lié à l&apos;utilisation du Service.</li>
        </ul>
        <p>
          La responsabilité de l&apos;Éditeur est en tout état de cause limitée au montant éventuellement
          payé par l&apos;utilisateur pour accéder au Service au cours des 12 derniers mois.
        </p>
      </Section>

      <Section title="7. Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du Service (code, design, textes, algorithmes de reconstruction
          de trades) est la propriété exclusive de l&apos;Éditeur et est protégé par les droits de
          propriété intellectuelle applicables. Toute reproduction, même partielle, est interdite
          sans autorisation écrite préalable.
        </p>
      </Section>

      <Section title="8. Modification des CGU">
        <p>
          L&apos;Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les modifications
          entrent en vigueur dès leur publication sur le Site. L&apos;utilisation continue du Service
          vaut acceptation des CGU modifiées.
        </p>
      </Section>

      <Section title="9. Droit applicable et juridiction">
        <p>
          Les présentes CGU sont régies par le droit français. En cas de litige, et à défaut de
          résolution amiable, les tribunaux compétents du ressort du siège de l&apos;Éditeur seront
          seuls compétents.
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

import type { SpecialRule } from "../game/types";
import { SPECIAL_RULE_ANNOUNCEMENT, SPECIAL_RULE_HEADING, SPECIAL_RULE_START } from "../variant/config";

type Props = { rule: SpecialRule; onReady?: () => void };

/** Mit onReady groß zum Vorlesen, danach klein als Erinnerung über den Hinweisen. */
export default function SpecialRuleCard({ rule, onReady }: Props) {
  return (
    <section className={onReady ? "special-rule" : "special-rule is-reminder"} aria-label={SPECIAL_RULE_HEADING}>
      <p className="special-rule-kicker">{SPECIAL_RULE_HEADING}</p>
      <h2 className="special-rule-title">{rule.title}</h2>
      <p className="special-rule-text">{rule.text}</p>
      {onReady && (
        <>
          <p className="hint">{SPECIAL_RULE_ANNOUNCEMENT}</p>
          <button type="button" className="primary" onClick={onReady}>{SPECIAL_RULE_START}</button>
        </>
      )}
    </section>
  );
}

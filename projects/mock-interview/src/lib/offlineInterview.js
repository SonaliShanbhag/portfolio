import { pickInterviewerAck } from "./feedback.js";

/**
 * @param {{ companyDisplay: string; role: string; level: string; queue: { kind: string; text: string }[] }}
 */
export function buildOpening({ companyDisplay, role, level, queue }) {
  const first = queue[0];
  return (
    `Hi - I'm your hiring manager for this practice round at ${companyDisplay}. ` +
    `We're hiring for ${role} (${level}). I'll alternate behavioral and technical questions; take your time. ` +
    `Here's the first question (${first.kind}):\n\n${first.text}`
  );
}

/**
 * @param {{ queue: { kind: string; text: string }[]; answeredCount: number; seed: number; lastAnswer: string }}
 */
export function buildFollowUp({ queue, answeredCount, seed, lastAnswer }) {
  const next = queue[answeredCount];
  if (!next) {
    return (
      "That wraps our scheduled questions. " +
      "Strong practice - reflect on where you gave concrete examples and where you could add metrics or tradeoffs next time. " +
      "Good luck with the real loop."
    );
  }
  const ack = pickInterviewerAck(lastAnswer ?? "", seed + answeredCount);
  return `${ack}Next question (${next.kind}):\n\n${next.text}`;
}

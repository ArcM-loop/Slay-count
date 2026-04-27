export default function HudTypewriter({ text, delay, speed, color }) {
  return <p style={{ color }} className="font-mono text-xs mt-2">{text}</p>;
}

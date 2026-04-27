export default function ParticleExplosion({ active, onDone }) {
  if (active && onDone) {
    setTimeout(onDone, 1000);
  }
  return null;
}

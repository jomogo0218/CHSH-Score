let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** 短促立體方塊「喀」一聲，跟按下位移同步 */
export function playClickSound() {
  try {
    const ac = getContext();
    if (!ac) return;
    if (ac.state === "suspended") void ac.resume();

    const t = ac.currentTime;
    const click = ac.createOscillator();
    const clickGain = ac.createGain();
    click.type = "square";
    click.frequency.setValueAtTime(210, t);
    click.frequency.exponentialRampToValueAtTime(72, t + 0.07);
    clickGain.gain.setValueAtTime(0.09, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    click.connect(clickGain);
    clickGain.connect(ac.destination);
    click.start(t);
    click.stop(t + 0.1);

    const tick = ac.createOscillator();
    const tickGain = ac.createGain();
    tick.type = "triangle";
    tick.frequency.setValueAtTime(1400, t);
    tick.frequency.exponentialRampToValueAtTime(600, t + 0.03);
    tickGain.gain.setValueAtTime(0.045, t);
    tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    tick.connect(tickGain);
    tickGain.connect(ac.destination);
    tick.start(t);
    tick.stop(t + 0.04);
  } catch {
    // ignore autoplay / unsupported
  }
}

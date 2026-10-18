import pc from 'picocolors';

export function getAsciiBanner() {
  const art = `
  ██╗  ██╗██╗███╗   ██╗██████╗     ██████╗██╗     ██╗   ██╗███████╗████████╗███████╗██████╗ 
  ██║ ██╔╝██║████╗  ██║██╔══██╗   ██╔════╝██║     ██║   ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗
  █████╔╝ ██║██╔██╗ ██║██║  ██║   ██║     ██║     ██║   ██║███████╗   ██║   █████╗  ██████╔╝
  ██╔═██╗ ██║██║╚██╗██║██║  ██║   ██║     ██║     ██║   ██║╚════██║   ██║   ██╔══╝  ██╔══██╗
  ██║  ██╗██║██║ ╚████║██████╔╝██╗╚██████╗███████╗╚██████╔╝███████║   ██║   ███████╗██║  ██║
  ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝ ╚═════╝╚══════╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
  `;

  const coloredArt = pc.cyan(art);
  const subtitle = `       ${pc.bold(pc.magenta('⚡ Local Cloud-Native Kubernetes Platform Orchestrator ⚡'))}`;
  const meta = `       ${pc.gray('Traefik · APISIX · Strimzi Kafka · Zot Registry · ArgoCD · Headlamp')}\n`;

  return `${coloredArt}\n${subtitle}\n${meta}`;
}

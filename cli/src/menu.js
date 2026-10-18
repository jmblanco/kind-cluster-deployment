import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAsciiBanner } from './banner.js';
import { checkPrerequisites } from './modules/prerequisites.js';
import { createKindCluster, deleteKindCluster, getClusterName } from './modules/cluster.js';
import { deployRegistry, deleteRegistry } from './modules/registry.js';
import { deployMongoDB, deleteMongoDB } from './modules/mongodb.js';
import { deployTraefik, deployApisix } from './modules/ingress.js';
import { deployKafka } from './modules/kafka.js';
import { deployArgoCD } from './modules/argocd.js';
import { deployObservability } from './modules/observability.js';
import { deployDashboard } from './modules/dashboard.js';
import { deployDemoOrderService } from './modules/demo-service.js';
import { checkDnsEntries, getSyncInstructions } from './modules/dns.js';
import { runCommand } from './executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export async function runInteractiveMenu() {
  console.clear();
  console.log(getAsciiBanner());

  p.intro(pc.bold(pc.bgCyan(pc.black(' KIND CLUSTER MANAGER '))));

  let keepRunning = true;

  while (keepRunning) {
    const action = await p.select({
      message: '¿Qué acción deseas realizar?',
      options: [
        { value: 'all', label: '🚀 Deploy Full Stack', hint: 'Cluster + Ingress + Kafka + Zot + ArgoCD + Observability + Dashboard' },
        { value: 'demo', label: '📦 Deploy Demo Order Service', hint: 'Construye y despliega el microservicio de órdenes E2E' },
        { value: 'granular', label: '🎯 Granular Custom Selection', hint: 'Selecciona módulos específicos con checkboxes' },
        { value: 'minimal', label: '⚡ Minimal Web Stack', hint: 'Cluster + Traefik Ingress + Dashboard' },
        { value: 'kafka_only', label: '📨 Event-Driven Stack', hint: 'Cluster + Traefik + Strimzi Kafka KRaft + Kafka UI' },
        { value: 'dns', label: '🌐 DNS Assistant & Hosts Check', hint: 'Verifica y asiste en la configuración de dominios .local' },
        { value: 'doctor', label: '🩺 Cluster Doctor & Diagnostics', hint: 'Verifica herramientas locales, Docker, DNS y pods' },
        { value: 'teardown', label: '🧹 Teardown / Cleanup', hint: 'Destruye el cluster Kind y contenedores locales' },
        { value: 'exit', label: '❌ Salir' }
      ]
    });

    if (p.isCancel(action) || action === 'exit') {
      p.outro(pc.gray('¡Hasta pronto! 👋'));
      keepRunning = false;
      break;
    }

    if (action === 'dns') {
      await handleDnsAssistant();
    } else if (action === 'doctor') {
      await handleDoctor();
    } else if (action === 'teardown') {
      await handleTeardown();
    } else if (action === 'demo') {
      await executeModulesSequence(['demo']);
    } else if (action === 'granular') {
      await handleGranularSelection();
    } else if (action === 'all') {
      await executeModulesSequence([
        'cluster', 'registry', 'mongodb', 'traefik', 'apisix',
        'kafka', 'argocd', 'observability', 'dashboard'
      ]);
    } else if (action === 'minimal') {
      await executeModulesSequence(['cluster', 'traefik', 'dashboard']);
    } else if (action === 'kafka_only') {
      await executeModulesSequence(['cluster', 'traefik', 'kafka']);
    }

    const next = await p.confirm({
      message: '¿Deseas volver al menú principal?',
      initialValue: true
    });

    if (p.isCancel(next) || !next) {
      p.outro(pc.cyan('Operaciones finalizadas con éxito.'));
      keepRunning = false;
    }
  }
}

export async function runCliCommand(command) {
  const cmd = (command || '').toLowerCase().trim();

  switch (cmd) {
    case 'check':
    case 'doctor': {
      console.log(pc.cyan('Comprobando requisitos del sistema...'));
      const prereqs = await checkPrerequisites();
      if (!prereqs.ok) {
        console.error(pc.red(`Herramientas faltantes: ${prereqs.missing.join(', ') || 'Ninguna'}`));
        console.error(pc.red(`Docker Daemon activo: ${prereqs.dockerRunning ? 'Sí' : 'NO'}`));
        process.exit(1);
      }
      console.log(pc.green('✔ Todas las herramientas requeridas están disponibles y Docker está activo.'));
      for (const [tool, ver] of Object.entries(prereqs.details)) {
        console.log(`  - ${pc.bold(tool)}: ${ver}`);
      }
      return;
    }

    case 'cluster':
      await executeModulesSequence(['cluster'], false);
      return;

    case 'registry':
      await executeModulesSequence(['registry'], false);
      return;

    case 'mongodb':
      await executeModulesSequence(['mongodb'], false);
      return;

    case 'ingress':
    case 'traefik':
      await executeModulesSequence(['traefik'], false);
      return;

    case 'apisix':
      await executeModulesSequence(['apisix'], false);
      return;

    case 'kafka':
      await executeModulesSequence(['kafka'], false);
      return;

    case 'argocd':
      await executeModulesSequence(['argocd'], false);
      return;

    case 'observability':
    case 'headlamp':
      await executeModulesSequence(['observability'], false);
      return;

    case 'dashboard':
      await executeModulesSequence(['dashboard'], false);
      return;

    case 'demo':
    case 'order-service':
      await executeModulesSequence(['demo'], false);
      return;

    case 'dns':
    case 'dns:check': {
      console.log(pc.cyan('Verificando configuración de DNS local en el archivo hosts...'));
      const dnsRes = checkDnsEntries();
      console.log(`Archivo inspeccionado: ${pc.bold(dnsRes.hostsPath)}`);
      if (dnsRes.error) {
        console.warn(pc.yellow(`Aviso: No se pudo leer el archivo hosts (${dnsRes.error}).`));
      }
      if (dnsRes.configured.length > 0) {
        console.log(pc.green(`✔ Dominios correctamente asociados a 127.0.0.1 (${dnsRes.configured.length}/${dnsRes.total}):`));
        for (const dom of dnsRes.configured) {
          console.log(`  - ${pc.green(dom)}`);
        }
      }
      if (!dnsRes.ok) {
        console.log(pc.yellow(`\n⚠ Dominios locales faltantes (${dnsRes.missing.length}):`));
        for (const dom of dnsRes.missing) {
          console.log(`  - ${pc.red(dom)}`);
        }
        const inst = getSyncInstructions(dnsRes.missing);
        console.log(pc.bold('\nPara añadirlos con permisos de administrador ejecuta:'));
        console.log(`\n  ${pc.cyan(inst.command)}\n`);
        console.log(pc.gray(`O añade manualmente la siguiente línea en ${inst.hostsPath}:`));
        console.log(`  ${pc.bold(inst.snippet)}\n`);
      } else {
        console.log(pc.green('\n✔ Todos los dominios .local están correctamente configurados en tu archivo hosts.\n'));
      }
      return;
    }

    case 'all':
    case 'up':
      await executeModulesSequence([
        'cluster', 'registry', 'mongodb', 'traefik', 'apisix',
        'kafka', 'argocd', 'observability', 'dashboard'
      ], false);
      return;

    case 'down':
    case 'delete':
    case 'clean':
    case 'teardown': {
      console.log(pc.red('Eliminando cluster Kind y contenedores locales...'));
      await deleteKindCluster(REPO_ROOT, msg => console.log(pc.gray(msg)));
      await deleteRegistry();
      await deleteMongoDB();
      console.log(pc.green('✔ Todos los recursos locales han sido eliminados.'));
      return;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      return;

    default:
      console.error(pc.red(`Comando no reconocido: "${command}"`));
      showHelp();
      process.exit(1);
  }
}

function showHelp() {
  console.log(`
${pc.bold(pc.cyan('KIND CLUSTER MANAGER CLI'))}

${pc.bold('Uso:')}
  npm start [comando]
  node ./bin/kind-manager.js [comando]

${pc.bold('Comandos disponibles:')}
  ${pc.green('check')}         Verifica herramientas necesarias (docker, kind, kubectl, helm)
  ${pc.green('cluster')}       Crea el cluster Kubernetes con Kind
  ${pc.green('registry')}      Despliega el registro local OCI Zot con Trivy
  ${pc.green('mongodb')}       Despliega el contenedor de MongoDB
  ${pc.green('ingress')}       Despliega Traefik Ingress Controller
  ${pc.green('apisix')}        Despliega Apache APISIX API Gateway
  ${pc.green('kafka')}         Despliega Strimzi Kafka (KRaft mode) y Kafka UI
  ${pc.green('argocd')}        Despliega ArgoCD y su Ingress
  ${pc.green('headlamp')}      Despliega Headlamp Explorer y Metrics-Server
  ${pc.green('dashboard')}     Despliega el Control Panel Dashboard
  ${pc.green('demo')}          Construye y despliega el microservicio de órdenes E2E
  ${pc.green('dns')}           Verifica y asiste en la configuración de dominios .local
  ${pc.green('all | up')}      Despliega el stack completo en orden de dependencias
  ${pc.green('down | clean')}  Elimina el cluster Kind y los contenedores
  ${pc.green('help')}          Muestra esta ayuda

Si no se proporciona ningún comando, se iniciará el menú visual e interactivo (TUI).
`);
}

async function handleDoctor() {
  const s = p.spinner();
  s.start('Comprobando herramientas del sistema...');
  const prereqs = await checkPrerequisites();
  s.stop('Comprobación de herramientas finalizada.');

  if (!prereqs.ok) {
    p.note(
      pc.red(`Herramientas faltantes: ${prereqs.missing.join(', ') || 'Ninguna'}\nDocker daemon: ${prereqs.dockerRunning ? 'Activo' : 'INACTIVO'}`),
      'Estado de Prerequisitos'
    );
    return;
  }

  p.note(
    Object.entries(prereqs.details)
      .map(([k, v]) => `${pc.green('✔')} ${pc.bold(k)}: ${v}`)
      .join('\n') + `\n${pc.green('✔')} ${pc.bold('Docker Daemon')}: Activo`,
    'Herramientas y Entorno'
  );

  const sDns = p.spinner();
  sDns.start('Comprobando resolución de dominios .local en hosts...');
  const dnsRes = checkDnsEntries();
  sDns.stop('Comprobación de DNS local finalizada.');

  if (!dnsRes.ok) {
    const inst = getSyncInstructions(dnsRes.missing);
    p.note(
      `${pc.yellow('⚠ Faltan dominios en tu archivo hosts:')}\n` +
      dnsRes.missing.map(d => `  - ${pc.red(d)}`).join('\n') +
      `\n\n${pc.bold('Comando sugerido con permisos de Administrador:')}\n${pc.cyan(inst.command)}`,
      'DNS Local Incompleto'
    );
  } else {
    p.note(
      dnsRes.configured.map(d => `${pc.green('✔')} ${d}`).join('\n'),
      'DNS Local Configurado (127.0.0.1)'
    );
  }

  const clusterName = getClusterName(REPO_ROOT);
  const s2 = p.spinner();
  s2.start(`Inspeccionando cluster Kind '${clusterName}'...`);
  const listRes = await runCommand('kind', ['get', 'clusters']);
  const clusters = listRes.stdout.split('\n').map(c => c.trim()).filter(Boolean);

  if (!clusters.includes(clusterName)) {
    s2.stop(pc.yellow(`El cluster '${clusterName}' no está creado.`));
    return;
  }

  s2.message('Consultando pods en todos los namespaces...');
  const podsRes = await runCommand('kubectl', ['get', 'pods', '-A']);
  s2.stop(`Cluster '${clusterName}' encontrado.`);

  if (podsRes.code === 0) {
    console.log('\n' + pc.cyan(podsRes.stdout) + '\n');
  }
}

async function handleDnsAssistant() {
  const s = p.spinner();
  s.start('Analizando archivo hosts del sistema...');
  const res = checkDnsEntries();
  s.stop('Análisis de hosts completado.');

  if (res.ok) {
    p.note(
      `${pc.green('✔')} Todos los dominios están asociados a 127.0.0.1 en:\n${pc.bold(res.hostsPath)}\n\n` +
      res.configured.map(d => `  ${pc.green('•')} ${d}`).join('\n'),
      'Estado de DNS Local'
    );
    return;
  }

  const inst = getSyncInstructions(res.missing);
  p.note(
    `${pc.bold('Archivo:')} ${res.hostsPath}\n\n` +
    `${pc.green('Configurados:')}\n` +
    (res.configured.length ? res.configured.map(d => `  ${pc.green('✔')} ${d}`).join('\n') : '  (Ninguno)') +
    `\n\n${pc.red('Faltantes:')}\n` +
    res.missing.map(d => `  ${pc.red('✖')} ${d}`).join('\n') +
    `\n\n${pc.bold('Línea a incluir:')}\n  ${pc.yellow(inst.snippet)}\n\n` +
    `${pc.bold('Comando para ejecutar con privilegios de Administrador / sudo:')}\n  ${pc.cyan(inst.command)}`,
    'Asistente de Configuración DNS Local'
  );
}

async function handleTeardown() {
  const confirmed = await p.confirm({
    message: pc.red('¿Estás seguro de que deseas destruir el cluster Kind y los contenedores locales?'),
    initialValue: false
  });

  if (!confirmed || p.isCancel(confirmed)) {
    p.log.info('Operación cancelada.');
    return;
  }

  const s = p.spinner();
  s.start('Eliminando cluster Kind...');
  await deleteKindCluster(REPO_ROOT, (msg) => s.message(msg));
  s.message('Eliminando contenedor Registry...');
  await deleteRegistry();
  s.message('Eliminando contenedor MongoDB...');
  await deleteMongoDB();
  s.stop(pc.green('Cluster y contenedores eliminados correctamente.'));
}

async function handleGranularSelection() {
  const selected = await p.multiselect({
    message: 'Marca los componentes que deseas desplegar (Espacio para marcar, Enter para confirmar):',
    options: [
      { value: 'cluster', label: 'Kind Kubernetes Cluster', hint: 'Base local node' },
      { value: 'registry', label: 'Zot OCI Registry & Web UI', hint: 'localhost:5000 / registry.local' },
      { value: 'mongodb', label: 'MongoDB Instance', hint: 'localhost:37017' },
      { value: 'traefik', label: 'Traefik Ingress Controller', hint: 'hostPort 80/443' },
      { value: 'apisix', label: 'Apache APISIX API Gateway', hint: 'apisix.local' },
      { value: 'kafka', label: 'Strimzi Kafka KRaft & Kafka UI', hint: 'kafka-ui.local' },
      { value: 'argocd', label: 'ArgoCD GitOps & Ingress', hint: 'argocd.local' },
      { value: 'observability', label: 'Headlamp & Metrics-Server', hint: 'headlamp.local' },
      { value: 'dashboard', label: 'Kind Control Panel Hub', hint: 'dashboard.local' },
      { value: 'demo', label: 'Demo Order Microservice E2E', hint: 'orders.local' }
    ]
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.log.warn('No se seleccionó ningún módulo.');
    return;
  }

  await executeModulesSequence(selected);
}

export async function executeModulesSequence(modules, interactive = true) {
  const s = interactive ? p.spinner() : null;
  if (s) {
    s.start('Verificando requisitos previos...');
  } else {
    console.log(pc.cyan('Verificando requisitos previos...'));
  }

  const prereqs = await checkPrerequisites();
  if (!prereqs.ok) {
    if (s) s.stop(pc.red('Faltan requisitos indispensables.'));
    console.error(pc.red(`Instala las herramientas faltantes o inicia Docker: ${prereqs.missing.join(', ')}`));
    if (!interactive) process.exit(1);
    return;
  }
  if (s) s.stop('Requisitos verificados.');

  const moduleOrder = [
    'cluster', 'registry', 'mongodb', 'traefik', 'apisix',
    'kafka', 'argocd', 'observability', 'dashboard', 'demo'
  ];

  const sortedModules = moduleOrder.filter(m => modules.includes(m));

  for (const mod of sortedModules) {
    const sp = interactive ? p.spinner() : null;
    try {
      if (mod === 'cluster') {
        if (sp) sp.start('Provisionando cluster Kind...'); else console.log(pc.cyan('Provisionando cluster Kind...'));
        const res = await createKindCluster(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'registry') {
        if (sp) sp.start('Provisionando Zot OCI Registry...'); else console.log(pc.cyan('Provisionando Zot OCI Registry...'));
        const res = await deployRegistry(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'mongodb') {
        if (sp) sp.start('Provisionando MongoDB...'); else console.log(pc.cyan('Provisionando MongoDB...'));
        const res = await deployMongoDB(msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'traefik') {
        if (sp) sp.start('Instalando Traefik Ingress...'); else console.log(pc.cyan('Instalando Traefik Ingress...'));
        const res = await deployTraefik(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'apisix') {
        if (sp) sp.start('Instalando Apache APISIX...'); else console.log(pc.cyan('Instalando Apache APISIX...'));
        const res = await deployApisix(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'kafka') {
        if (sp) sp.start('Instalando Strimzi Kafka KRaft & Kafka UI...'); else console.log(pc.cyan('Instalando Strimzi Kafka KRaft & Kafka UI...'));
        const res = await deployKafka(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'argocd') {
        if (sp) sp.start('Instalando ArgoCD...'); else console.log(pc.cyan('Instalando ArgoCD...'));
        const res = await deployArgoCD(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'observability') {
        if (sp) sp.start('Instalando Metrics-Server & Headlamp...'); else console.log(pc.cyan('Instalando Metrics-Server & Headlamp...'));
        const res = await deployObservability(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'dashboard') {
        if (sp) sp.start('Desplegando Dashboard...'); else console.log(pc.cyan('Desplegando Dashboard...'));
        const res = await deployDashboard(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      } else if (mod === 'demo') {
        if (sp) sp.start('Desplegando Demo Order Service...'); else console.log(pc.cyan('Desplegando Demo Order Service...'));
        const res = await deployDemoOrderService(REPO_ROOT, msg => sp ? sp.message(msg) : console.log(pc.gray(msg)));
        if (sp) sp.stop(pc.green(`✔ ${res.message}`)); else console.log(pc.green(`✔ ${res.message}`));
      }
    } catch (err) {
      if (sp) {
        sp.stop(pc.red(`✖ Error desplegando módulo '${mod}': ${err.message}`));
      } else {
        console.error(pc.red(`✖ Error desplegando módulo '${mod}': ${err.message}`));
      }

      if (interactive) {
        const abort = await p.confirm({
          message: '¿Deseas continuar con el resto de módulos seleccionados?',
          initialValue: false
        });
        if (!abort || p.isCancel(abort)) {
          p.log.warn('Despliegue cancelado por el usuario.');
          break;
        }
      } else {
        process.exit(1);
      }
    }
  }

  const endpointText = 
    `Endpoints configurados:\n` +
    `· Dashboard:    http://dashboard.local (o http://localhost:8088)\n` +
    `· Headlamp UI:  http://headlamp.local\n` +
    `· Registry:     http://registry.local (o http://localhost:5000)\n` +
    `· Kafka UI:     http://kafka-ui.local\n` +
    `· APISIX:       http://apisix.local\n` +
    `· ArgoCD:       https://argocd.local\n` +
    `· Order Demo:   http://orders.local`;

  if (interactive) {
    p.note(endpointText, 'Resumen de Acceso');
  } else {
    console.log('\n' + pc.cyan(endpointText) + '\n');
  }
}

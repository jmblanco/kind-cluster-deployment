import path from 'node:path';
import { runCommand } from '../executor.js';
import { ensureNamespace, sanitizeName } from './k8s-utils.js';

export async function deployKafka(repoRoot, onProgress = () => {}) {
  const rawKafkaNs = process.env.KAFKA_NS || 'kafka';
  const kafkaNs = sanitizeName(rawKafkaNs, 'kafka');

  onProgress(`Ensuring namespace '${kafkaNs}'...`);
  await ensureNamespace(kafkaNs);

  onProgress('Configuring Helm repo for Strimzi Kafka Operator...');
  await runCommand('helm', ['repo', 'add', 'strimzi', 'https://strimzi.io/charts/']);
  await runCommand('helm', ['repo', 'update', 'strimzi']);

  onProgress('Installing Strimzi Cluster Operator...');
  await runCommand('helm', [
    'upgrade', '--install', 'strimzi-kafka-operator', 'strimzi/strimzi-kafka-operator',
    '-n', kafkaNs,
    '--set', 'watchAnyNamespace=true'
  ]);

  onProgress('Applying Strimzi Kafka Cluster (KRaft mode)...');
  const brokerConfig = path.join(repoRoot, 'templates', 'kafka-broker.config.yaml');
  await runCommand('kubectl', ['apply', '-f', brokerConfig, '-n', kafkaNs]);

  onProgress('Deploying Kafka UI (Kafbat)...');
  await runCommand('helm', ['repo', 'add', 'kafka-ui', 'https://provectus.github.io/kafka-ui-charts']);
  await runCommand('helm', ['repo', 'update', 'kafka-ui']);

  const kafkaUiValues = path.join(repoRoot, 'templates', 'kafka-ui-values.yaml');
  await runCommand('helm', [
    'upgrade', '--install', 'kafka-ui', 'kafka-ui/kafka-ui',
    '-n', kafkaNs,
    '-f', kafkaUiValues
  ]);

  const ingPath = path.join(repoRoot, 'ingress', 'kafka-ui.ingress.yaml');
  await runCommand('kubectl', ['apply', '-f', ingPath]);

  return { success: true, message: 'Kafka KRaft Cluster & UI deployed at http://kafka-ui.local' };
}

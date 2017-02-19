

const PUSH_CHANNEL = 'parse-server-push';
const DEFAULT_BATCH_SIZE = 100;

export class PushQueue {
  parsePublisher: Object;
  channel: String;
  batchSize: Number;
}
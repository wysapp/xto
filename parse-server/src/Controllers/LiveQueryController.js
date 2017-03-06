
export class LiveQueryController {

  classNames: any;
  liveQueryPublisher: any;

  constructor(config: any) {
    if (!config || !config.classNames) {
      this.classNames = new Set();
    } else if (config.classNames instanceof Array) {
      this.classNames = new Set(config.classNames);
    } else {
      throw 'liveQuery.classes should be an array of string'
    }


  }


  hasLiveQuery(className: string): boolean {
    return this.classNames.has(className);
  }
}


export default LiveQueryController;
const sleep = (ms: number, signal?: any) =>
  new Promise((resolve, reject) => {
    let timeout: any;

    const abortHandler = () => {
      clearTimeout(timeout);
      //reject();
    };

    timeout = setTimeout(resolve, ms);

    signal?.addEventListener("abort", abortHandler);
    return timeout;
  });
export default sleep;

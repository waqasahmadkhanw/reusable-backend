let acceptingTraffic = false;
let shuttingDown = false;

export const setAcceptingTraffic = (value) => {
  acceptingTraffic = Boolean(value);
};

export const isAcceptingTraffic = () => acceptingTraffic;

export const setShuttingDown = (value) => {
  shuttingDown = Boolean(value);
};

export const isShuttingDown = () => shuttingDown;

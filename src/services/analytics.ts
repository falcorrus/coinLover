import ReactGA from "react-ga4";

const MEASUREMENT_IDS = ["G-X63WEFC7X3", "G-LG9JX54LWC"];

export const initGA = () => {
  ReactGA.initialize(MEASUREMENT_IDS.map(id => ({ trackingId: id })));
};

export const setGAUser = (userId: string) => {
  ReactGA.set({ user_id: userId });
};

export const trackScreen = (screenName: string) => {
  ReactGA.send({ hitType: "pageview", page: screenName, title: screenName });
};

export const trackEvent = (action: string, params?: any) => {
  ReactGA.event(action, params);
};

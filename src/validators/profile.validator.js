/** Profile update validation rules. */
export const updateProfileRules = {
  name: { type: "string", min: 2, max: 100 },
  bio: { type: "string", max: 1000 },
  phone: { type: "string", max: 30, regex: /^[+()\-\s\d.]{7,30}$/ },
  profession: { type: "string", max: 100 },
  address: { type: "string", max: 500 },
};

export const updateSocialLinksRules = {
  linkedin: { type: "url", max: 500 },
  github: { type: "url", max: 500 },
  twitter: { type: "url", max: 500 },
  website: { type: "url", max: 500 },
};

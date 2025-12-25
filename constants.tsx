
import { Event, Photo } from './types';

export const USER_PROFILE = {
  name: "Alex Mitchell",
  email: "alex.mitchell@eventsync.com",
  role: "Event Organizer",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAC_j1ve-x5U-_MCrfAizxFNz2zhLgrVYn73Vq5Z_Mgdgd3cW9gVZqRzGf0wOc-AA6Av-RAe0yAqBq74WxdFFSELRGLEXmcz_SBFrfwyVUtleTKN1DwUHNJFMzecr0cfsbgzSmkwh7ZsBN61CDs6bQE6nmvAIBEeXQ5BsqOBWNSwoOMky8MLwi2r1d2k4Gnu9b39YMKhk8xLRHa-79UptD4oUpKxw6ai5ijVMJZODByMINY04f5KYMQxb2b9ofrNPGB_sqTS3euKejS",
  stats: {
    hosted: 12,
    upcoming: 5,
    past: 48
  }
};

export const FEATURED_EVENTS: Event[] = [
  {
    id: 'f1',
    title: 'Tech Summit 2024',
    date: 'Oct 24',
    time: '8 PM',
    location: 'San Francisco',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWOaLuihEGqj0sxMHsKjtjVNkTkfpLJc_6pX6XnE9mjUAkWAup8_4DtSSvTcw9akEhcHHIHrlX0FJxL1MCSc40117OFkFvDDyaRrQqgTsjJapsbNlGkqP6ythDRjPZeEPiSH93L7dN2FjSnRpN-j16eC4RrJXt7SdiU7qI6IT_Fh70tpH2aRPutCUpoWHQYkosoLnuFnlqgxbSx-B4tYuI3FQn9msGmBvlh0PsPhbi0svVGweJXn3AiAn0pTHIJeQGlFQ7S_87UXa1',
    category: 'Technology'
  },
  {
    id: 'f2',
    title: 'Neon Nights',
    date: 'Nov 12',
    time: '10 PM',
    location: 'Downtown Arena',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnzRvfOQnY-bZyDW73k3tsdaLGcH7xu-yG8mQm035YvliOusrUsdSu7NaZubo0pJT3QY6wfvRpEBjFTznpFrJGsFxrgiqWIjkE5P9JZchytGpIJdUsCr0Ni563hxWNKfgSc5L3d6v9U5jZNb_2T-Pvum8C9xAyWkTm4-wiolqDmsG6JEgrO-pita9jN6Bhsrf-bY0J6eWb1oIPU4PYCUpQimMIfUmCxtDFHCvqcVr2_aWlBXSZgs52Valp1FHIRL4NrYRoZu7tTGxf',
    category: 'Social'
  }
];

export const RECOMMENDED_EVENTS: Event[] = [
  {
    id: 'r1',
    title: 'Rooftop Yoga & Brunch',
    date: 'Tomorrow',
    time: '9:00 AM',
    location: '0.8 mi',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsp02LY-SQlP1A4PT5xZoOQ6wwb4ZykhmuEEEv7SkrOF_Y4y5Zbay23UQ7ia5FouofN7yTzlR0ABEpWMSO7Ixe6YWxNL2ttUqkCn2fmHKnV_VmgB7_laqKQ-UIGvusAnhNgqq5RR6LNiPHsqHqkz3owL6GfpzrA8cGZXKqZhIjgDH8qEnaLCyoLH3Ghh6vhH9mdwu3n-Qk8cslvvKIRWZcs_GbKb5OFaxWEfbCycK6cjsTV2S_AiGswD2YkbTV6kquVybJdvtylVP0',
    category: 'Wellness',
    distance: '0.8 mi',
    attendeesCount: 12,
    attendeesAvatars: [
        'https://picsum.photos/seed/u1/100',
        'https://picsum.photos/seed/u2/100'
    ]
  },
  {
    id: 'r2',
    title: 'Creative Workshop: Fluid Art',
    date: 'Sat, Oct 28',
    time: '2:00 PM',
    location: '2.4 mi',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQJcBVCXWNy8PGiGIEEmZjcma_DL58tDmeZEKHDjY-VBwg2n8k2-zFouZ3kgJ3LrXs0B7sR8Au4XnTIIpwQ349HK7TSsLeXG-ZKLMjWsjoMCzB-q1BZ_XTKyJN_mPQyODDYSI01D7YSxxe-UdAABGB5XL5qkgpy1FPjAkcfiefcj7B0HQykylAj8E-SmOiinppg-plhpYJ-TfxHjeEUTVV4ifHI-3ANz7OLlVHVdBlLS7tK-zwiKY3N8G6JWYNHxROl6UVkRfKeJyJ',
    category: 'Art & Design',
    distance: '2.4 mi'
  }
];

export const GALLERY_PHOTOS: Photo[] = [
  {
    id: 'p1',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgv98fxiGYedYLxw4N5Lg7OpuOOB-bx4bgukGUjKdaqLLu72ShJRZtpHVxK9TYcl5ldCbt5jp0xJwO7R3g5yKONWCTuoQw_5PVPMgxI9VOOPURGCbz-vZOovN5Vti8V5rdt9TKiRnVZyjPnuoM0II2Xv0uV01hEg712j8Xb-8iH_pibcejDAgPLkve_L-3CSgVeqtgsNTHy7a1OOzUa7AwcxbE5G7KulaiklwrkfAp60I-f3QFi0Pb18OGsta-uaVL3BFG4M47_SPU',
    user: { handle: '@alex_d', initials: 'AD', color: 'bg-black' }
  },
  {
    id: 'p2',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCA89FlU0xj5R4O1GnPHkECc1ngPapdBtpcGCQ9L8REQrrg-Fs7dWE-TIWJnKlt285uaQEiJzDEoUgwDmqqsAHknC26yMX--5CVFIG7MFucMWwjHeQQxvxmI4_mt23DCImXKishhHKeVpQcpwb9nov-r-ku8Uhzqh1CY4q5ffja1Zh3MfhIvV8Ds25hU3A-Qmq0Kl0Czs_i1i3ct8_cumERWeDBOpwjLyuXiJ5v2ZSR7-sjIDmLLT1Fbp-dLNe0ioXIkDCRSeZA_OBI',
    user: { handle: '@sarah_j', avatar: 'https://picsum.photos/seed/sarah/100' },
    isFavorite: true
  },
  {
    id: 'p3',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnk5FcLII8U-i97K8hZF0SlLqxZjpGhFW-aWCETMrEcGzqKAKYWmvZ0o26BbKruV8P1i9dl1JIo2-UDBdkOAnejG7UAvMHQFqQDla5XNfbbC-33DfmlrGzgcOcntFitP0Rz8blFJcuOVowers5EvXlvAAbxE5UjyoET2A5Xcu5CA9N0JrtUNq_hGqiQ-g2wuqYSeSHnAEPhQo0_LSEULc_AAvDz6YJualuOdUh3a32fjRXUKhKD5tczsNoOysiktTfhtHwHCT8B32C',
    user: { handle: '@mike_t', initials: 'MT', color: 'bg-slate-800' }
  },
  {
    id: 'p4',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgeYXgG9fxBOKN6ImEDDTCFPicfmYM06bQ6XNB55kyyi0Bk0e7PXjCgss21OBWWNCmDdwVefl-1vzY-u-PUBw2rQF4E8j3iWHmpKt2ysFBkgSWyR0bv1jVgHEPRf4H-ahNmrTD4lQljQuqwlrrRrHFKw1o7tNQy66C6KkxfGDwqeJdb86q4IgPVdVnBuLFROR_6v6pLEskLt1voBkG_OazSdqSh-iBEfkzMNwi2zVpWP2XX_pavanyb9ClOx1M6OIuXgobQuUHtbjJ',
    user: { handle: '@emily_r', avatar: 'https://picsum.photos/seed/emily/100' }
  }
];

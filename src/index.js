import { parse } from "cookie";
import { codes } from '../helpers/countryCodes';
import { averageIntensity } from '@tgwf/co2';

let carbonAwareCookie;

// A class to add a data attribute to the body tag when a page has had changes made to it.
class addDataAttribute {
  element(element) {
    element.setAttribute("carbon-aware-site", "true");
  }
}

// A class to remove the element from the HTML.
class removeElement {
  element(element) {
    element.remove();
  }
}

// A function to return a fallback response if there is an error or the user has opted out.
const fallback = async (res, message) => {
  let response = new Response(res.body, {
    ...res,
    headers: {
      "carbon-aware-site": message,
    },
  });

  return response;
};

// map 2-digit country code to 3-digit equivalent
const findCountryCode = (twoChar) => {
	let countryCode = twoChar;

	if (twoChar.startsWith('AU-')) {
		countryCode = 'AU'
	} else if (twoChar.startsWith('BR-')) {
		countryCode = 'BR'
	} else if (twoChar.startsWith('CA-')) {
		countryCode = 'CA'
	} else if (twoChar.startsWith('CL-')) {
		countryCode = 'CL'
	} else if (twoChar.startsWith('DK-')) {
		countryCode = 'DK'
	} else if (twoChar.startsWith('ES-')) {
		countryCode = 'ES'
	} else if (twoChar.startsWith('FO-')) {
		countryCode = 'FO'
	} else if (twoChar.startsWith('FR-')) {
		countryCode = 'FR'
	} else if (twoChar.startsWith('GB-')) {
		countryCode = 'GB'
	} else if (twoChar.startsWith('GR-')) {
		countryCode = 'GR'
	} else if (twoChar.startsWith('IN-')) {
		countryCode = 'IN'
	} else if (twoChar.startsWith('IT-')) {
		countryCode = 'IT'
	} else if (twoChar.startsWith('IQ-')) {
		countryCode = 'IQ'
	} else if (twoChar.startsWith('JP-')) {
		countryCode = 'JP'
	} else if (twoChar.startsWith('MX-')) {
		countryCode = 'MX'
	} else if (twoChar.startsWith('MY-')) {
		countryCode = 'MY'
	} else if (twoChar.startsWith('NO-')) {
		countryCode = 'NO'
	} else if (twoChar.startsWith('NZ-')) {
		countryCode = 'NZ'
	} else if (twoChar.startsWith('PT-')) {
		countryCode = 'PT'
	} else if (twoChar.startsWith('RU-')) {
		countryCode = 'RU'
	} else if (twoChar.startsWith('SE-')) {
		countryCode = 'SE'
	} else if (twoChar.startsWith('UA-')) {
		countryCode = 'UA'
	} else if (twoChar.startsWith('US-')) {
		countryCode = 'US'
	}

	return codes.find(code => code.alpha2Code === countryCode)?.alpha3Code
}

// Get the averages intensity for the country using CO2.js
const getAverageIntensity = (country) => {
	return averageIntensity.data[country] || averageIntensity.data["World"];
}

// A function to check the carbon intensity and return the response with the appropriate changes.
const checkCarbonIntensity = async (res, data) => {
  const countryCode = findCountryCode(data.countryCode)
	const averageIntensity = getAverageIntensity(countryCode)

  try {
    // If the carbon intensity is below the threshold, return the original page.
    if (data.data.carbonIntensity < averageIntensity) {
      return new Response(res.body, {
        ...res,
        headers: {
          "carbon-aware-intensity": data.data.carbonIntensity,
          "carbon-aware-location": data.countryCode,
          'carbon-aware-location-average': averageIntensity,
        },
      });
    } else {
      // If the carbon intensity is above the threshold, return the page with the changes.
      let response = new Response(res.body, {
        ...res,
        headers: {
          "carbon-aware-intensity": data.data.carbonIntensity,
          "carbon-aware-location": data.countryCode,
          'carbon-aware-location-average': averageIntensity,
        },
      });

      //   Use HTMLRewriter to make changes to the HTML of the page before returning it.
      // In the example below, we add an attribute to the <body> tag and remove a <script> tag.
      return (
        new HTMLRewriter()
          .on("body", new addDataAttribute())
          // An example of removing an element from the HTML.
          .on('script[src="not-so-important.js"]', new removeElement())
          .transform(response)
      );
    }
  } catch (e) {
    return fallback(res, "Error fetching data");
  }
};

export default {
  async fetch(request, env, ctx) {
    const res = await fetch(request);
    const contentType = res.headers.get("Content-Type");

    // We only want the script to run for HTML pages.
    if (contentType.includes("text/html")) {
      // Optional: You can set a cookie to allow users to opt-out of seeing carbon-aware versions of the site.
      const COOKIE_NAME = "carbon-aware-site";
      const cookie = parse(request.headers.get("Cookie") || "");
      carbonAwareCookie = cookie[COOKIE_NAME];

      if (carbonAwareCookie != null) {
        // if user has rejected the site show the original page
        if (carbonAwareCookie === "0") {
          return fallback(res, "User opt-out");
        }
      }

      // Get the visitor's location data from Cloudflare request headers.
      const lat = request.cf?.latitude;
      const lon = request.cf?.longitude;
      const country = request.cf?.country;

      //   If there's no location data at all, return the original page.
      if (lat === undefined && lon === undefined && country === undefined) {
        return fallback(res, "Location undefined");
      }

      // Check to see if there is cached grid intensity data for the user's country.
	//   This data is stored in a KV namespace called ELECMAPS_CACHE.
	// You can setup a KV namespace from the web UI or using Wrangler.
	// https://developers.cloudflare.com/workers/wrangler/commands/#kvnamespace
      const value = await env.ELECMAPS_CACHE.get(country, {
        type: "json",
      });
      //   If there is cached data, check the carbon intensity and return the response.
      if (value) {
        return checkCarbonIntensity(res, value);
      }

      try {
        // If there is no cached data, fetch the latest data from the CO2signal API.
        const data = await fetch(
          `https://api.co2signal.com/v1/latest?lon=${lon}&lat=${lat}`,
          {
            headers: {
              // You'll need to set the CO2SIGNAL_TOKEN environment variable to your API key.
              // The best way to do this is by using Wrangler's secret feature.
              // https://developers.cloudflare.com/workers/wrangler/commands/#secret
              "auth-token": env.CO2SIGNAL_TOKEN,
            },
          }
        );

        // If there is an error connecting to the API, return the original page.
        if (!data.ok || !data) {
          return fallback(res, "Error connecting to service");
        }

        const resp = await data.json();
        // If the country doesn't have grid intensity data, then return the original page.
        if (!resp.data?.carbonIntensity) {
          return fallback(res, "No data found");
        }

        // Cache the data for the user's country for 1 hour.
        await env.ELECMAPS_CACHE.put(country, JSON.stringify(resp), {
          expirationTtl: 60 * 60, // 1 hour
        });

        // Check the carbon intensity and return the response.
        return checkCarbonIntensity(res, data);
      } catch (e) {
        return fallback(res, "Error fetching data");
      }
    }

    return new Response(res.body, {
      ...res,
    });
  },
};

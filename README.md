# Make your website carbon aware

The concept of a carbon-aware website is one where the content/user experience of a site changes depending on how the grid intensity of the electricity grid. Implementing carbon awareness on this website was inspired by the work of [Branch Magazine](https://branch.climateaction.tech/issues/issue-1/designing-branch-sustainable-interaction-design-principles/).

## What is this?

This repository contains a Cloudflare Workers starter template that can be used to make a website carbon-aware. It is a very bare bones implementation, and is designed to serve as a launching pad, from which developers can begin to play around with the idea of carbon awareness on their own sites or apps.

## Getting started

To start working with the code, clone this repository & run `npm install` in your console.

### You will also need

- A Cloudflare account with [Workers functionality enabled](https://www.cloudflare.com/en-au/products/workers/).
- A [CO2signal](https://co2signal.com/) API key. _Note that CO2signals does have rate limits. If your site receives lots of traffic, then you should consider using [Electricity Maps](https://www.electricitymaps.com/) paid API._

## Modifying code

All code for this project lives in the `src/index.js` file. I've left comments in there so that you can hopefully get a grips of how everything works.

## Deploying

You can deploy this Cloudflare Worker using the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/commands/#publish). Run `wrangler publish` and follow the prompts.

To have the worker execute on specific page routes, you should update the `wrangler.toml` file to include [a `route` key](https://developers.cloudflare.com/workers/wrangler/configuration/#types-of-routes).

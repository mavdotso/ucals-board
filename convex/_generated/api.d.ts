/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentJobs from "../agentJobs.js";
import type * as board from "../board.js";
import type * as campaigns from "../campaigns.js";
import type * as cards from "../cards.js";
import type * as comments from "../comments.js";
import type * as docs from "../docs.js";
import type * as pipelines from "../pipelines.js";
import type * as posts from "../posts.js";
import type * as search from "../search.js";
import type * as tools from "../tools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentJobs: typeof agentJobs;
  board: typeof board;
  campaigns: typeof campaigns;
  cards: typeof cards;
  comments: typeof comments;
  docs: typeof docs;
  pipelines: typeof pipelines;
  posts: typeof posts;
  search: typeof search;
  tools: typeof tools;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

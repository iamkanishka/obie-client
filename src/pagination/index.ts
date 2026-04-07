import type { HttpClient } from "../http/client";

/**
 * Lazily iterates all pages of an OBIE paginated endpoint by following
 * `Links.Next` HATEOAS links.
 *
 * @example
 * ```typescript
 * const iter = new PageIterator(http, firstUrl, (page) => page.Data.Transaction ?? []);
 * for await (const transaction of iter) {
 *   console.log(transaction.TransactionId);
 * }
 * ```
 */
export class PageIterator<TPage, TItem> implements AsyncIterable<TItem> {
  private readonly http: HttpClient;
  private readonly firstUrl: string;
  private readonly extractItems: (page: TPage) => TItem[];

  constructor(
    http: HttpClient,
    firstUrl: string,
    extractItems: (page: TPage) => TItem[],
  ) {
    this.http = http;
    this.firstUrl = firstUrl;
    this.extractItems = extractItems;
  }

  public async *[Symbol.asyncIterator](): AsyncGenerator<TItem> {
    let nextUrl: string | undefined = this.firstUrl;

    while (nextUrl !== undefined) {
      const page = await this.http.get<TPage>(nextUrl);
      const items = this.extractItems(page);
      for (const item of items) yield item;
      nextUrl = extractNextLink(page);
    }
  }

  /** Collects all items eagerly — use only for small result sets. */
  public async toArray(): Promise<TItem[]> {
    const results: TItem[] = [];
    for await (const item of this) results.push(item);
    return results;
  }

  /** Returns all raw pages. */
  public async allPages(): Promise<TPage[]> {
    const pages: TPage[] = [];
    let nextUrl: string | undefined = this.firstUrl;
    while (nextUrl !== undefined) {
      const page = await this.http.get<TPage>(nextUrl);
      pages.push(page);
      nextUrl = extractNextLink(page);
    }
    return pages;
  }
}

function extractNextLink(page: unknown): string | undefined {
  if (
    typeof page === "object" &&
    page !== null &&
    "Links" in page &&
    typeof (page as Record<string, unknown>)["Links"] === "object"
  ) {
    const links = (page as Record<string, unknown>)["Links"] as Record<string, unknown>;
    if (typeof links["Next"] === "string" && links["Next"] !== "") {
      return links["Next"];
    }
  }
  return undefined;
}

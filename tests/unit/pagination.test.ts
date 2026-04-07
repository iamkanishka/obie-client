import { PageIterator } from "../../src/pagination";
import type { HttpClient } from "../../src/http/client";

interface TxPage {
  Data: { Transaction: Array<{ id: string }> };
  Links: { Self: string; Next?: string };
  Meta: { TotalPages: number };
}

function makeMockHttp(pages: TxPage[]): Pick<HttpClient, "get"> {
  let call = 0;
  return {
    get: jest.fn().mockImplementation(async () => {
      const page = pages[call++];
      if (!page) throw new Error("Unexpected extra page fetch");
      return page;
    }),
  };
}

function makePage(items: string[], nextUrl?: string): TxPage {
  return {
    Data: { Transaction: items.map((id) => ({ id })) },
    Links: { Self: "https://example.com/txns", ...(nextUrl ? { Next: nextUrl } : {}) },
    Meta: { TotalPages: 1 },
  };
}

describe("PageIterator", () => {
  it("iterates single page of items", async () => {
    const http = makeMockHttp([makePage(["tx1", "tx2", "tx3"])]);
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com/txns", (p) => p.Data.Transaction);
    const items: Array<{ id: string }> = [];
    for await (const item of iter) items.push(item);
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.id)).toEqual(["tx1", "tx2", "tx3"]);
  });

  it("follows Next links across multiple pages", async () => {
    const http = makeMockHttp([
      makePage(["tx1", "tx2"], "https://example.com/txns?page=2"),
      makePage(["tx3", "tx4"], "https://example.com/txns?page=3"),
      makePage(["tx5"]),
    ]);
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com/txns", (p) => p.Data.Transaction);
    const items = await iter.toArray();
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.id)).toEqual(["tx1", "tx2", "tx3", "tx4", "tx5"]);
  });

  it("toArray returns all items", async () => {
    const http = makeMockHttp([makePage(["a", "b"])]);
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com", (p) => p.Data.Transaction);
    const result = await iter.toArray();
    expect(result).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("allPages returns raw pages", async () => {
    const p1 = makePage(["a"], "https://example.com?page=2");
    const p2 = makePage(["b"]);
    const http = makeMockHttp([p1, p2]);
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com", (p) => p.Data.Transaction);
    const pages = await iter.allPages();
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe(p1);
    expect(pages[1]).toBe(p2);
  });

  it("handles empty page gracefully", async () => {
    const http = makeMockHttp([makePage([])]);
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com", (p) => p.Data.Transaction);
    const items = await iter.toArray();
    expect(items).toHaveLength(0);
  });

  it("stops when Next link is missing", async () => {
    const http = makeMockHttp([makePage(["only"])]);
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com", (p) => p.Data.Transaction);
    const items = await iter.toArray();
    expect(items).toHaveLength(1);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it("propagates fetch errors", async () => {
    const http: Pick<HttpClient, "get"> = {
      get: jest.fn().mockRejectedValue(new Error("Network error")),
    };
    const iter = new PageIterator<TxPage, { id: string }>(http as unknown as HttpClient, "https://example.com", (p) => p.Data.Transaction);
    await expect(iter.toArray()).rejects.toThrow("Network error");
  });
});

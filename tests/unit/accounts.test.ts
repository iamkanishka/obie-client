import { jest, describe, it, expect } from "@jest/globals";
import { AccountsService } from "../../src/accounts";
import type { HttpClient } from "../../src/http/client";

function mockHttp(getImpl = jest.fn()): HttpClient {
  return { get: getImpl, post: jest.fn(), put: jest.fn(), delete: jest.fn(), postRaw: jest.fn(), getRaw: jest.fn() } as unknown as HttpClient;
}

const BASE = "https://aspsp.example.com";
const AIS = "/open-banking/v3.1/aisp";

const ACCOUNT_RESP = {
  Data: { Account: [{ AccountId: "acc-001", Currency: "GBP", AccountType: "Personal", AccountSubType: "CurrentAccount" }] },
  Links: { Self: `${BASE}${AIS}/accounts` },
  Meta: { TotalPages: 1 },
};

describe("AccountsService", () => {
  describe("list", () => {
    it("GETs /accounts", async () => {
      const get = jest.fn().mockResolvedValue(ACCOUNT_RESP);
      const svc = new AccountsService(mockHttp(get), BASE);
      const result = await svc.list();
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/accounts`);
      expect(result.Data.Account).toHaveLength(1);
    });
  });

  describe("get", () => {
    it("GETs /accounts/{AccountId}", async () => {
      const get = jest.fn().mockResolvedValue(ACCOUNT_RESP);
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.get("acc-001");
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/accounts/acc-001`);
    });
  });

  describe("listBalances", () => {
    it("GETs /balances", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.listBalances();
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/balances`);
    });
  });

  describe("getBalances", () => {
    it("GETs /accounts/{AccountId}/balances", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.getBalances("acc-001");
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/accounts/acc-001/balances`);
    });
  });

  describe("listTransactions", () => {
    it("GETs /transactions without date filter", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.listTransactions();
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/transactions`);
    });

    it("appends fromBookingDateTime query param", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.listTransactions({ fromBookingDateTime: "2024-01-01T00:00:00Z" });
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining("fromBookingDateTime=2024-01-01"),
      );
    });

    it("appends both date params", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.listTransactions({
        fromBookingDateTime: "2024-01-01T00:00:00Z",
        toBookingDateTime: "2024-12-31T23:59:59Z",
      });
      const url = (get.mock.calls[0] as [string])[0];
      expect(url).toContain("fromBookingDateTime");
      expect(url).toContain("toBookingDateTime");
    });
  });

  describe("getStatementTransactionsBulk", () => {
    it("GETs /statements/{StatementId}/transactions", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.getStatementTransactionsBulk("stmt-001");
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/statements/stmt-001/transactions`);
    });
  });

  describe("getParty", () => {
    it("GETs /party", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.getParty();
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/party`);
    });
  });

  describe("listProducts", () => {
    it("GETs /products", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.listProducts();
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/products`);
    });
  });

  describe("listOffers", () => {
    it("GETs /offers", async () => {
      const get = jest.fn().mockResolvedValue({});
      const svc = new AccountsService(mockHttp(get), BASE);
      await svc.listOffers();
      expect(get).toHaveBeenCalledWith(`${BASE}${AIS}/offers`);
    });
  });

  describe("iterateTransactions", () => {
    it("returns a PageIterator", () => {
      const svc = new AccountsService(mockHttp(), BASE);
      const iter = svc.iterateTransactions("acc-001");
      expect(typeof iter[Symbol.asyncIterator]).toBe("function");
    });

    it("yields all transactions across pages", async () => {
      const page1 = {
        Data: { Transaction: [{ id: "t1" }] },
        Links: { Self: "", Next: `${BASE}${AIS}/accounts/acc-001/transactions?page=2` },
        Meta: {},
      };
      const page2 = {
        Data: { Transaction: [{ id: "t2" }, { id: "t3" }] },
        Links: { Self: "" },
        Meta: {},
      };
      const get = jest.fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      const svc = new AccountsService(mockHttp(get), BASE);
      const items = await svc.iterateTransactions("acc-001").toArray();
      expect(items).toHaveLength(3);
    });
  });
});

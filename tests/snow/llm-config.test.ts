import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultChatClient, resolveLlmApiKey } from "../../server/ai/chat-client";

/**
 * 锁住这条规则：真实环境变量优先于 .env，
 * 所以项目必须用专属变量名，否则会被外层环境的 OPENAI_API_KEY 静默劫持。
 * 这个坑在 2026-11-05 真实发生过一次（配置对、调用一直 401）。
 */
function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const saved = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]])
  );

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("project-specific key wins over the generic OPENAI_API_KEY", () => {
  withEnv({ SNOW_LLM_API_KEY: "snow-key", OPENAI_API_KEY: "polluted-key" }, () => {
    assert.equal(resolveLlmApiKey(), "snow-key");
    assert.ok(createDefaultChatClient());
  });
});

test("falls back to OPENAI_API_KEY only when the project key is absent", () => {
  withEnv({ SNOW_LLM_API_KEY: undefined, OPENAI_API_KEY: "legacy-key" }, () => {
    assert.equal(resolveLlmApiKey(), "legacy-key");
  });
});

test("blank values count as absent", () => {
  withEnv({ SNOW_LLM_API_KEY: "   ", OPENAI_API_KEY: "legacy-key" }, () => {
    assert.equal(resolveLlmApiKey(), "legacy-key");
  });
});

test("no key at all yields no client, which drives the fallback path", () => {
  withEnv({ SNOW_LLM_API_KEY: undefined, OPENAI_API_KEY: undefined }, () => {
    assert.equal(resolveLlmApiKey(), undefined);
    assert.equal(createDefaultChatClient(), undefined);
  });
});

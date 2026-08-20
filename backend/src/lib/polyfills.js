// Polyfills for Bun & Node runtime cross-compatibility.
// Fixes Bun's NotImplementedError when BSON / MongoDB driver calls
// v8.startupSnapshot.isBuildingSnapshot().

try {
  const patchV8 = (v8Obj) => {
    if (!v8Obj) return;
    if (!v8Obj.startupSnapshot) {
      v8Obj.startupSnapshot = { isBuildingSnapshot: () => false };
    } else if (typeof v8Obj.startupSnapshot.isBuildingSnapshot === "function") {
      const orig = v8Obj.startupSnapshot.isBuildingSnapshot;
      v8Obj.startupSnapshot.isBuildingSnapshot = function () {
        try {
          return orig.apply(this, arguments);
        } catch {
          return false;
        }
      };
    }
  };

  // Patch process.getBuiltinModule if present (used by BSON)
  if (typeof globalThis.process?.getBuiltinModule === "function") {
    const origGetBuiltin = globalThis.process.getBuiltinModule.bind(globalThis.process);
    globalThis.process.getBuiltinModule = function (name) {
      const mod = origGetBuiltin(name);
      if (name === "v8" || name === "node:v8") {
        patchV8(mod);
      }
      return mod;
    };
    try {
      patchV8(origGetBuiltin("v8"));
      patchV8(origGetBuiltin("node:v8"));
    } catch {
      // Ignore
    }
  }
} catch {
  // Silent fallback
}

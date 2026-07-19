"use strict";

const { buildDeterministicResult } = require("./_shared/result");
const { jsonResponse } = require("./_shared/security");

exports.handler = async () => jsonResponse(410, {
  error: "Die Auswertung wird inzwischen deterministisch beim Speichern des Tests erzeugt. Dieser frühere Analyse-Endpunkt ist deaktiviert.",
});

module.exports._test = { deterministicFallback: buildDeterministicResult };

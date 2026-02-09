import * as Comlink from 'comlink';
import { AvroPhonetic } from './avro.min.js';

let CandidateSelection = {};

const avro = new AvroPhonetic(
  function () {
    return CandidateSelection;
  },
  function (cS) {
    CandidateSelection = cS;
  },
);

const comm = {
  getVersion: function () {
    return avro.version;
  },
  getSuggestion: function (subtext) {
    // console.log("Worker: getSuggestion", subtext);
    const res = subtext.match(/\s?([^\s]+)$/);
    if (res == null) return null;
    const bnregex = /[\u0980-\u09FF]+$/;
    if (bnregex.exec(res[1])) return null;
    const query = res[1];

    const bnarr = avro.suggest(query);

    bnarr.words = bnarr.words.slice(0, 10);
    if (avro.candidate(query) === query) {
      bnarr.prevSelection = bnarr.words.length;
    }
    bnarr.words.push(query);

    return bnarr;
  },
  setCommit: function (qtxt, value) {
    avro.commit(qtxt, value);
  },
};

Comlink.expose(comm);

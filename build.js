const fs       = require("fs");
const path     = require("path");
const process  = require("process");
const archiver = require("archiver");

const src_dir = path.join(__dirname, "src");

/**
 * @param {"en"|"ja"|"ko"} locale
 */
async function load_locale(locale = "en") {
  const locale_file_text = await fs.promises.readFile(path.join(src_dir, "_locales", locale, "messages.json"), {encoding: "utf-8"});
  const json_data = JSON.parse(locale_file_text);
  return json_data
}

/**
 * @param {"en"|"ja"|"ko"} locale
 */
function get_locale_message(key, locale_json) {
  if (!key.startsWith("__MSG_") || !key.endsWith("__")) {
    throw new Error("Not a valid locale key.");
  }
  const _key = key.replace(/^__MSG_/, "").replace(/__$/, "");
  if (Object.hasOwn(locale_json, _key)) {
    return locale_json[_key].message;
  }
  throw new Error(`The locale_json does not contain key ${_key}`);
}

/**
 * @param {string[]} args The arguments passed to the script from the CLI.
 */
async function main(args) {
  if (typeof args !== "object" || !Array.isArray(args) || args.length !== 3 || (args[2].toLowerCase() !== "firefox" && args[2].toLowerCase() !== "chrome")) {
    throw new Error("Argument of mode not specified required argument either \"firefox\" or \"chrome\".");
  }
  const locale_json = await load_locale("en");
  await fs.promises.copyFile(path.join(src_dir, `manifest-${args[2]}.json`), path.join(src_dir, `manifest.json`));

  const manifest = require("./src/manifest.json");

  const file_ext = args[2] === "firefox" ? ".xpi" : ".zip";

  const short_name = get_locale_message(manifest.short_name, locale_json);

  const archive = archiver("zip");
  const output = fs.createWriteStream(`${short_name}-${manifest.version}${file_ext}`);
  output.on("close", () => {
    console.log(archive.pointer() + " total bytes");
    console.log("archiver has been finalized and the output file descriptor has closed.");
  });
  output.on("end", () => {
    console.log("Data has been drained");
  });
  archive.on("error", (err) => {
    throw err;
  });
  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn(err);
    } else {
      throw err;
    }
  });
  archive.pipe(output);
  archive.directory(path.join(src_dir, "_locales"),                 "_locales");
  archive.directory(path.join(src_dir, "css"),                      "css");
  archive.directory(path.join(src_dir, "html"),                     "html");
  archive.directory(path.join(src_dir, "img"),                      "img");
  archive.directory(path.join(src_dir, "js"),                       "js");
  archive.file(path.join(src_dir, "background-wrapper.js"), { name: "background-wrapper.js" });
  archive.file(path.join(src_dir, "manifest.json"),         { name: "manifest.json" });
  archive.finalize();
}

main(process.argv);

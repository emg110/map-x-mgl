/**
* mapx api db-utils
*/
const {pgRead, pgWrite} = require('@mapx/db');
const settings = require('@root/settings');
const helpers = require('@mapx/helpers');
const template = require('@mapx/template');
const valid = require('@fxi/mx_valid');

/**
 * crypto key
 */
const key = settings.db.crypto.key;

/**
 * Test if a table exists and has rows
 *
 * @async
 * @param {String} id of the table
 * @return {Promise<Boolean>} Table exists
 */
async function tableHasValues(idTable, schema) {
  schema = schema || 'public';
  const sqlExists = `
  /*NO LOAD BALANCE*/
  SELECT EXISTS (
   SELECT 1
   FROM   information_schema.tables 
   WHERE  table_schema = '${schema}'
   AND    table_name = '${idTable}'
   )`;
  const sqlEmpty = `
   /*NO LOAD BALANCE*/
   SELECT count(geom) as n from ${idTable}
  `;
  let isThere = false;
  let hasValues = false;

  const res = await pgRead.query(sqlExists);
  isThere = res.rowCount > 0 && res.rows[0].exists === true;

  if (isThere) {
    const resEmpty = await pgRead.query(sqlEmpty);
    hasValues = resEmpty.rowCount > 0 && resEmpty.rows[0].n * 1 > 0;
  }
  return isThere && hasValues;
}

/**
 * Decrypt message using default key
 * @param {String} txt Message to decrypt
 * @return {String} decrypted message
 */
async function decrypt(txt) {
  const sqlDecrypt = "SELECT mx_decrypt('" + txt + "','" + key + "') as msg";
  const res = await pgRead.query(sqlDecrypt);
  if (res.rowCount > 0) {
    return JSON.parse(res.rows[0].msg);
  } else {
    return {};
  }
}

/**
 * Encrypt message using default key
 * @param {String} txt Message to encrypt
 * @return {String} encrypted message
 */
async function encrypt(txt) {
  const sql = "SELECT mx_encrypt('" + txt + "','" + key + "') as msg";
  const result = pgRead.query(sql);
  if (result.rowCount > 0) {
    return result.rows[0].msg;
  } else {
    return false;
  }
}

/**
 * Register a source in mx_sources
 * @param {String} idSource Id of the source
 * @param {Integer} idUser Id of the user
 * @param {String} idProject Id of the project
 * @param {String} title English title
 * @return {Boolean} inserted
 */
async function registerSource(idSource, idUser, idProject, title) {
  var options = {};

  if (typeof idSource === 'object') {
    options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
  }

  var sqlAddSource = `INSERT INTO mx_sources (
    id, editor, readers, editors, date_modified, type, project, data
  ) VALUES (
    $1::text,
    $2::integer,
    '["publishers"]',
    '["publishers"]',
    now(),
    'vector',
    $3::text,
    '{"meta":{"text":{"title":{"en":"${title}"}}}}' 
  )`;


  await pgWrite.query(sqlAddSource, [idSource, idUser, idProject]);
  return true;
}

/**
 * Test empty table : if no records, remove table, else register it as source
 * @param {String|Object} idSource id of the layer to add, or object with idSource, idUser, idProject, title.
 */
async function registerOrRemoveSource(idSource, idUser, idProject, title) {
  if (typeof idSource === 'object') {
    options = idSource;
    idSource = options.idSource;
    idUser = options.idUser * 1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
  }

  var sqlCountRow = {
    text: `SELECT count(*) n FROM ${idSource}`
  };
  const r = await pgRead.query(sqlCountRow);
  const count = r.rowCount > 0 ? r.rows[0].n * 1 : 0;
  const stats = {
    removed: false,
    registered: false
  };

  
  if (count === 0) {
    await removeSource(idSource);
    stats.removed = true;
  }

  if (stats.removed === false) {
    await registerSource(idSource, idUser, idProject, title);
    stats.registered = true;
  }
  return stats;
}

/**
 * Remove source
 * @param {String} idSource Source to remove
 */
async function removeSource(idSource) {
  var sqlDelete = {
    text: `DELETE FROM mx_sources WHERE id = $1::text`,
    values: [idSource]
  };
  var sqlDrop = {
    text: `DROP TABLE IF EXISTS ${idSource}`
  };
  const rmDrop = await pgWrite.query(sqlDrop);
  const rmDelete = await pgWrite.query(sqlDelete);
  return {
    drop: rmDrop,
    delete: rmDelete
  };
}

/**
 * Get layer columns names
 * @param {String} id of the layer
 */
async function getColumnsNames(idLayer) {
  var queryAttributes = {
    text: `SELECT column_name AS names 
    FROM information_schema.columns 
    WHERE table_name=$1`,
    values: [idLayer]
  };
  const data = await pgRead.query(queryAttributes);
  return data.rows.map((a) => a.names);
}

/**
 * Get simple (json) column type
 * @param {String} idSource Id of the source
 * @param {String} idAttr Id of the attribute
 * @return {String} type
 */
async function getColumnsTypesSimple(idSource, idAttr) {
  if (!valid.isSourceId(idSource) || !idAttr) {
    return null;
  }
  const cNames = valid.isArray(idAttr) ? idAttr : [idAttr];
  const cNamesTxt = `('${cNames.join("','")}')`;

  const opt = {
    idSource: idSource,
    idAttributesString: cNamesTxt
  };

  const sqlSrcAttr = helpers.parseTemplate(template.getColumnsTypesSimple, opt);
  const resp = await pgRead.query(sqlSrcAttr);
  return resp.rows;
}

/**
 * Get the latest timestamp from a source / layer / table
 * @param {String} idSource Id of the source
 * @return {numeric} timetamp
 */
async function getSourceLastTimestamp(idSource) {
  if (!valid.isSourceId(idSource)) {
    return null;
  }
  const q = `WITH maxTimestampData as (
            SELECT pg_xact_commit_timestamp(xmin) as t 
            FROM ${idSource}
          ),
          maxTimestampStructure as (
            SELECT pg_xact_commit_timestamp(xmin) as t 
            FROM pg_class
            WHERE relname = '${idSource}'
          ),
          maxBoth as (
             SELECT t 
             FROM maxTimestampData
             UNION
             SELECT t 
            FROM maxTimestampStructure
            )
          SELECT max(t) as timestamp from maxBoth;`;
  const data = await pgRead.query(q);
  const row = data.rows[0];

  if (row) {
    return row.timestamp;
  }
}
/**
 * Get layer title
 * @param {String} id of the layer
 */
async function getLayerTitle(idLayer, language) {
  language = language || 'en';
  var queryAttributes = {
    text: `SELECT data#>>'{"meta","text","title","${language}"}' AS title 
    FROM mx_sources
    WHERE id=$1`,
    values: [idLayer]
  };
  const res = await pgRead.query(queryAttributes);
  return res.rows[0].title;
}

/**
 * Check for layer geom validity
 * @param {String} idLayer id of the layer to check
 * @param {Boolean} useCache Use cache
 * @param {Boolean} autoCorrect Try an automatic correction
 */
async function isLayerValid(idLayer, useCache, autoCorrect) {
  useCache = helpers.toBoolean(useCache, true);
  autoCorrect = helpers.toBoolean(autoCorrect, false);

  var idValidColumn = '_mx_valid';

  /**
   * Cache column creation
   */
  var sqlNewColumn = `
  ALTER TABLE ${idLayer} 
  ADD COLUMN IF NOT EXISTS ${idValidColumn} BOOLEAN
  DEFAULT null
  `;

  /*
   * Validation query
   */
  var sqlValidate = `
  UPDATE ${idLayer} 
  SET ${idValidColumn} = ST_IsValid(geom)
  WHERE ${idValidColumn} IS null
  `;

  /**
   * Autocorrect query
   */
  var sqlAutoCorrect = `
  UPDATE ${idLayer}
  SET geom = 
    CASE
      WHEN GeometryType(geom) ~* 'POLYGON'
      THEN ST_Multi(ST_Buffer(geom,0))
      ELSE ST_MakeValid(geom)
    END,
    ${idValidColumn} = true 
  WHERE 
    NOT ${idValidColumn} 
  `;

  /*
   * Set cache to true
   */
  var sqlDeleteColumn = `
  ALTER TABLE ${idLayer}
  DROP COLUMN IF EXISTS ${idValidColumn}
  `;

  /**
   * Count valid query
   */
  var sqlValidityStatus = `
  /*NO LOAD BALANCE*/
  SELECT count(${idValidColumn}) as n, ${idValidColumn} as valid
  FROM  ${idLayer}
  GROUP BY ${idValidColumn}`;

  const title = await getLayerTitle(idLayer);
  /**
   * Invalidate if not use cache
   */
  if (!useCache) {
    await pgWrite.query(sqlDeleteColumn);
  }
  await pgWrite.query(sqlNewColumn);
  /**
   * Validate if null
   */
  await pgWrite.query(sqlValidate);

  /**
   * Autocrrect
   */
  if (autoCorrect) {
    await pgWrite.query(sqlAutoCorrect);
  }
  /**
   * Get summary
   */
  const res = await pgRead.query(sqlValidityStatus);
  /**
   * Default
   */
  var out = {
    nValid: 0,
    nInvalid: 0
  };

  res.rows.forEach((row) => {
    var n = row.n ? row.n * 1 || 0 : 0;
    switch (row.valid) {
      case true:
        out.nValid = n;
        break;
      case false:
        out.nInvalid = n;
        break;
    }
  });

  return {
    id: idLayer,
    valid: out.nInvalid === 0,
    title: title,
    status: out,
    useCache: useCache,
    autoCorrect: autoCorrect
  };
}

/**
 * Check for multiple layer geom validity
 * @param {Array} idsLayer Array of id of layer to check
 * @param {Boolean} force Force revalidation of previously wrong geom
 */
function areLayersValid(idsLayers, useCache, autoCorrect) {
  idsLayers = idsLayers instanceof Array ? idsLayers : [idsLayers];
  var queries = idsLayers.map(function(id) {
    return isLayerValid(id, useCache, autoCorrect);
  });
  return Promise.all(queries);
}

/**
* Exports
*/
module.exports = {
  getColumnsNames,
  getColumnsTypesSimple,
  getSourceLastTimestamp,
  getLayerTitle,
  isLayerValid,
  areLayersValid,
  removeSource,
  tableHasValues,
  decrypt,
  encrypt,
  registerSource,
  registerOrRemoveSource,
};

const elContainer = document.getElementById('mapx');
const elResults = document.getElementById('results');
const mapx = new mxsdk.Manager({
  container: elContainer,
  url: 'http://dev.mapx.localhost:8880'
});

mapx.on('message', (message) => {
  if (message.level === 'log') {
    console.info(`%c 🤓 ${message.text}`, 'color: #76bbf7');
  } else if (message.level === 'message') {
    console.info(`%c 😎 ${message.text}`, 'color: #70e497');
  } else if (message.level === 'warning') {
    console.info(`%c 🥴 ${message.text}`, 'color: #d09c23');
  } else if (message.level === 'error') {
    console.info(`%c 🤬 ${message.text}`, 'color: #F00');
  }
});
const groups = new window.URL(window.location.href).searchParams.get('groups');
const titles = new window.URL(window.location.href).searchParams.get('titles');
const t = new mxsdk.Testing({
  container: elResults,
  title: 'mapx sdk test',
  groups: groups ? groups.split(',') : [],
  titles: titles ? titles.split(',') : []
});
/**
 * MapX respond
 */
async function stopIfGuest() {
  const isGuest = await mapx.ask('is_user_guest');
  if (isGuest) {
    return t.stop('Need logged user');
  }
}
mapx.once('ready', () => {
  t.check('Get list methods', {
    init: () => {
      return mapx.ask('get_sdk_methods');
    },
    tests: [
      {
        name: 'test if array of string',
        test: (methods) => {
          return t.h.isArrayOfString(methods);
        }
      }
    ]
  });
  t.check('Get views list', {
    init: () => {
      return mapx.ask('get_views');
    },
    tests: [
      {
        name: 'is array of views',
        test: (views) => {
          return t.h.isArrayOfViews(views);
        }
      }
    ]
  });
  t.check('Trigger login window', {
    init: async () => {
      await stopIfGuest();
      return mapx.ask('show_modal_login');
    },
    tests: [
      {
        name: 'has login modal',
        test: async () => {
          const pass = await mapx.ask('has_el_id', {
            id: 'loginCode',
            timeout: 500
          });
          await mapx.ask('close_modal_all');
          return pass;
        }
      }
    ]
  });
  t.check('Get / Set language', {
    tests: [
      {
        name: 'test if the language is set',
        test: async () => {
          const lang = await mapx.ask('get_language');
          const langAlt = lang === 'en' ? 'ru' : 'en';
          await mapx.ask('set_language', {lang: langAlt});
          const langSet = await mapx.ask('get_language');
          const pass = langSet === langAlt;
          await mapx.ask('set_language', {lang: lang});
          return pass;
        }
      }
    ]
  });
  t.check('Get views id list', {
    init: () => {
      return mapx.ask('get_views_id');
    },
    tests: [
      {
        name: 'is array of views id',
        test: (idViews) => {
          return t.h.isArrayOfViewsId(idViews);
        }
      }
    ]
  });
  t.check('Get views with active layers on map', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: ['vt', 'rt']
      });
      await mapx.ask('view_add', {idView: view.id});
      const ids = await mapx.ask('get_views_with_visible_layer');
      await mapx.ask('view_remove', {idView: view.id});
      return {
        ids: ids,
        id: view.id
      };
    },
    tests: [
      {
        name: 'is array of views id',
        test: (r) => {
          return t.h.isArrayOfViewsId(r.ids);
        }
      },
      {
        name: 'id in ids',
        test: (r) => {
          return r.ids.indexOf(r.id) > -1;
        }
      }
    ]
  });
  t.check('Set view order', {
    init: async () => {
      await mapx.ask('set_views_list_sort', {asc: true, mode: 'text'});
      const viewsOrder = await mapx.ask('get_views_order');
      const titlesAfter = await mapx.ask('get_views_title', {
        lang: 'en',
        views: viewsOrder
      });
      return titlesAfter;
    },
    tests: [
      {
        name: 'Order is ok',
        test: (titles) => {
          return t.h.isSorted(titles);
        }
      }
    ]
  });
  t.check('Get view vt attribute meta', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: 'vt'
      });
      const meta = await mapx.ask('get_view_meta_vt_attribute', {
        idView: view.id
      });
      return meta;
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });
  t.check('Get view table attribute config', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: 'vt'
      });
      const config = await mapx.ask('get_view_table_attribute_config', {
        idView: view.id
      });
      return config;
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });
  t.check('Get view table attribute url', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: 'vt'
      });
      const url = await mapx.ask('get_view_table_attribute_url', {
        idView: view.id
      });
      return url;
    },
    tests: [
      {
        name: 'is url',
        test: (r) => {
          return t.h.isUrl(r);
        }
      }
    ]
  });
  t.check('Get view table attribute', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: 'vt'
      });
      const data = await mapx.ask('get_view_table_attribute', {
        idView: view.id
      });
      return data;
    },
    tests: [
      {
        name: 'is array of object',
        test: (r) => {
          return t.h.isArrayOfObject(r);
        }
      }
    ]
  });
  t.check('Get view vt source meta', {
    init: async () => {
      // jshint ignore:start
      const view = await mapx.ask('_get_random_view', {
        type: 'vt'
      });
      const idSource = view?.data?.source?.layerInfo?.name;
      // jshint ignore:end
      return mapx.ask('get_source_meta', {
        idSource: idSource
      });
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });
  t.check('Get view rt or vt legend', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: ['vt', 'rt'],
        filter: (view, test) => {
          /**
           * Evaluated in is_test module context
           */ // jshint ignore:start
          const rules = view.data?.style?.rules ?? [];
          const legend = view.data?.source?.legend ?? '';
          // jshint ignore:end
          return (
            (test.isViewVt(view) && rules.length > 0) ||
            (test.isViewRt(view) && legend && test.isUrl(legend))
          );
        }
      });
      return mapx.ask('get_view_legend_image', {idView: view.id});
    },
    tests: [
      {
        name: 'is base 64 image',
        test: (png) => {
          return t.h.isBase64img(png);
        }
      }
    ]
  });
  t.check('Get view meta', {
    timeout: 10000,
    init: async () => {
      const view = await mapx.ask('_get_random_view');
      return mapx.ask('get_view_meta', {idView: view.id});
    },
    tests: [
      {
        name: 'is object with meta key',
        test: (r) => {
          return t.h.isObject(r) && t.h.isObject(r.meta);
        }
      }
    ]
  });
  t.check('Get user id', {
    init: () => {
      return mapx.ask('get_user_id');
    },
    tests: [
      {
        name: 'is numeric',
        test: (r) => {
          return t.h.isNumeric(r);
        }
      }
    ]
  });
  t.check('Get user ip', {
    init: () => {
      return mapx.ask('get_user_ip');
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });
  t.check('Get user roles', {
    init: () => {
      return mapx.ask('get_user_roles');
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });
  t.check('Get user email', {
    init: async () => {
      await stopIfGuest();
      return mapx.ask('get_user_email');
    },
    tests: [
      {
        name: 'is email',
        test: (r) => {
          return t.h.isEmail(r);
        }
      }
    ]
  });
  t.check('Filter view by text', {
    group: 'filters',
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: 'vt',
        filter: (view, test) => {
          /**
           * Evaluated in `is_test` module context
           */ return (
            test.isObject(view.data.attribute) &&
            view.data.attribute.type === 'string'
          );
        }
      });
      if (!t.h.isView(view)) {
        return t.stop('Need at least a vt view with string attribute');
      }
      return view;
    },
    tests: [
      {
        name: 'Set/get filter layers by text values',
        timeout: 10000,
        test: async (view) => {
          if (!t.h.isView(view)) {
            return false;
          }
          await mapx.ask('view_add', {idView: view.id});
          const values = view.data.attribute.table
            .map((v) => v.value)
            .filter((v) => t.h.isString(v));
          await mapx.ask('set_view_layer_filter_text', {
            idView: view.id,
            value: values
          });
          const res = await mapx.ask('get_view_layer_filter_text', {
            idView: view.id
          });
          const pass =
            t.h.isArray(res) &&
            values.reduce((a, v) => (!a ? a : res.indexOf(v) > -1), true);
          await mapx.ask('view_remove', {idView: view.id});
          return pass;
        }
      }
    ]
  });
  t.check('Get collection by project', {
    init: () => {
      return mapx.ask('get_project_collections');
    },
    tests: [
      {
        name: 'is array',
        test: (r) => {
          return t.h.isArray(r);
        }
      }
    ]
  });
  t.check('Set dashboard visibility', {
    init: async () => {
      const views = await mapx.ask('get_views');
      const view = views.find((v) => {
        return !!v.data.dashboard;
      });
      await mapx.ask('view_add', {idView: view.id});
      return view;
    },
    tests: [
      {
        name: 'Dashboard is visible',
        test: async (view) => {
          let pass = false;
          const hasDashboard = await mapx.ask('has_dashboard');
          if (hasDashboard) {
            await mapx.ask('set_dashboard_visibility', {
              show: true
            });
            pass = await mapx.ask('is_dashboard_visible');
            await mapx.ask('set_dashboard_visibility', {
              show: false
            });
            pass = pass && !(await mapx.ask('is_dashboard_visible'));
          }
          await mapx.ask('view_remove', {idView: view.id});
          return hasDashboard && pass;
        }
      }
    ]
  });
  t.check('Get collection of open views', {
    init: async () => {
      const views = await mapx.ask('get_views');
      const view = views.find((v) => {
        return t.h.isArray(v.data.collections) && v.data.collections.length > 0;
      });
      await mapx.ask('view_add', {idView: view.id});
      return view;
    },
    tests: [
      {
        name: 'View collections match',
        test: async (view) => {
          const collectionAfter = await mapx.ask('get_project_collections', {
            open: true
          });
          await mapx.ask('view_remove', {idView: view.id});
          const diff = d(collectionAfter, view.data.collections);
          const pass = diff.length === 0;
          return pass;
          function d(a, b) {
            var bSet = new Set(b);
            return a.filter(function(x) {
              return !bSet.has(x);
            });
          }
        }
      }
    ]
  });
  t.check('Load projects', {
    init: () => {
      return mapx.ask('get_projects');
    },
    tests: [
      {
        name: 'is array of projects',
        test: (r) => {
          return t.h.isProjectsArray(r);
        }
      },
      {
        name: 'Change project',
        timeout: 10000,
        test: async (r) => {
          const pos = Math.floor(Math.random() * (r.length - 1));
          const newProject = r[pos].id;
          const currProject = await mapx.ask('get_project');
          const success = await mapx.ask('set_project', {
            idProject: newProject
          });
          if (success) {
            return await mapx.ask('set_project', {idProject: currProject});
          } else {
            return false;
          }
        }
      }
    ]
  });
  t.check('Show edit view modal', {
    init: async () => {
      await stopIfGuest();
      const project = await mapx.ask('get_project');
      const view = await mapx.ask('_get_random_view', {
        type: null,
        filter: (view, test) => {
          /**
           * Evaluated in `is_test` module context
           */ return test.isViewEditable(view) && view.project === project;
        }
      });
      if (!t.isView(view)) {
        return t.stop('Need at least a vt view wit string attribute');
      }
      return view;
    },
    tests: [
      {
        name: 'has editable view ',
        test: (v) => {
          return t.h.isViewEditable(v);
        }
      },
      {
        name: 'Display view edit modal',
        timeout: 10000,
        test: async (v) => {
          const editable = t.h.isViewEditable(v);
          if (!editable) {
            return false;
          }
          const show = await mapx.ask('show_modal_view_edit', {
            idView: v.id
          });
          const pass = await mapx.ask('has_el_id', {
            id: 'modalViewEdit',
            timeout: 1500
          });
          await mapx.ask('close_modal_all');
          return show && pass;
        }
      }
    ]
  });
  t.check('Trigger map composer', {
    init: async () => {
      return mapx.ask('show_modal_map_composer');
    },
    tests: [
      {
        name: 'has map_composer panel',
        test: async () => {
          const pass = await mapx.ask('has_el_id', {
            id: 'mapcomposer',
            timeout: 1500
          });
          await mapx.ask('close_modal_all');
          return pass;
        }
      }
    ]
  });
  t.check('Trigger download view source : vt', {
    init: async () => {
      await stopIfGuest();
      const view = await mapx.ask('_get_random_view', {
        type: ['vt']
      });
      await mapx.ask('download_view_source_vector', {
        idView: view.id
      });
      return null;
    },
    tests: [
      {
        name: 'has modal',
        test: async () => {
          const hasModalEl = await mapx.ask('has_el_id', {
            id: 'modalSourceDownload',
            timeout: 1000
          });
          await mapx.ask('close_modal_all');
          return hasModalEl;
        }
      }
    ]
  });
  t.check('GeoJSON: create view, download geojson data', {
    init: async () => {
      const view = await mapx.ask('view_geojson_create', {
        random: {n: 100},
        save: false
      });
      const res = await mapx.ask('download_view_source_geojson', {
        idView: view.id
      });
      return {
        data: res.data,
        id: view.id
      };
    },
    tests: [
      {
        name: 'has data',
        test: async (res) => {
          return res.data.features.length === 100;
        }
      },
      {
        name: 'has layers',
        test: async (res) => {
          const visibles = await mapx.ask('get_views_with_visible_layer');
          await mapx.ask('view_geojson_delete', {idView: res.id});
          return visibles.indexOf(res.id) >= 0;
        }
      }
    ]
  });
  t.check('Trigger share module for a view', {
    init: async () => {
      const view = await mapx.ask('_get_random_view', {
        type: ['vt', 'rt', 'sm', 'cc']
      });
      await mapx.ask('show_modal_share', {
        idView: view.id
      });
      return null;
    },
    tests: [
      {
        name: 'has modal',
        test: async () => {
          const hasModalEl = await mapx.ask('has_el_id', {
            id: 'modalShare',
            timeout: 3000
          });
          await mapx.ask('close_modal_all');
          return hasModalEl;
        }
      }
    ]
  });
  t.check('Tools - trigger sharing manager', {
    init: async () => {
      return mapx.ask('show_modal_tool', {tool: 'sharing_manager'});
    },
    tests: [
      {
        name: 'has modal',
        test: async (r) => {
          if (!r) {
            return false;
          }
          const hasModalEl = await mapx.ask('has_el_id', {
            id: 'modalShare',
            timeout: 2000
          });
          await mapx.ask('close_modal_all');
          return hasModalEl;
        }
      }
    ]
  });
  t.check('Tools - add new view', {
    init: async () => {
      await stopIfGuest();
      return await mapx.ask('show_modal_tool', {tool: 'view_new'});
    },
    tests: [
      {
        name: 'has modal',
        test: async (ok) => {
          if (!ok) {
            return false;
          }
          const hasModalEl = await mapx.ask('has_el_id', {
            id: 'modalShare',
            timeout: 2000
          });
          await mapx.ask('close_modal_all');
          return hasModalEl;
        }
      }
    ]
  });
  t.check('Tools - validate source geom', {
    init: async () => {
      await stopIfGuest();
      return await mapx.ask('show_modal_tool', {tool: 'source_validate_geom'});
    },
    tests: [
      {
        name: 'has modal',
        test: async (ok) => {
          if (!ok) {
            return false;
          }
          const hasModalEl = await mapx.ask('has_el_id', {
            id: 'validateSourceGeom',
            timeout: 2000
          });
          await mapx.ask('close_modal_all');
          return hasModalEl;
        }
      }
    ]
  });
  /**
   * Run tests
   */ t.run({
    finally: () => {
      console.log('Tests finished');
    }
  });
});

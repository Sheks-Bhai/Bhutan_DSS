import GroupLoader from "./GroupLoader.js";
import MapLoader from "./MapLoader.js";
import ViewLoader from "./ViewLoader.js";

class AppLoader {

  // APPLICATION //
  app;

  // PORTAL, GROUP, MAP, VIEW //
  portal;
  group;
  map;
  view;

  /**
   *
   */
  constructor({app}) {
    this.app = app;
  }

  /**
   *
   * @returns {Promise}
   */
  load() {
    return new Promise((resolve, reject) => {
      this._load().then((loadMessage) => {
        console.info(loadMessage);
        resolve({
          portal: this.portal,
          group: this.group,
          map: this.map,
          view: this.view
        });
      }).catch(reject);
    });
  }

  /**
   *
   * @private
   */
  _load() {
    return new Promise((resolve, reject) => {
      // ESRI CONFIG //
      require(['esri/config'], (esriConfig) => {

        // CLEAR ERROR MESSAGE //
        this.app.clearError();

        // SIGN IN MESSAGE //
        let signInMessage = `Application created on ${ (new Date()).toLocaleString() }`;

        // REQUIRES AUTHENTICATION //
        let requiresAuthentication = false;

        // PORTAL URL //
        if (this.app?.portalUrl) {
          esriConfig.portalUrl = this.app.portalUrl;
        }

        //
        // API KEY //
        //
        if (this.app?.apiKey) {
          requiresAuthentication = true;

          // CONFIGURE APIKEY //
          esriConfig.apiKey = this.app.apiKey;

          // LOAD PORTAL //
          this._loadPortal().then(() => {
            signInMessage = `Application created via API key. [ ${ (new Date()).toLocaleString() } ]`;
            resolve(signInMessage);
          }).catch(reject);

        } else {
          require(['esri/identity/IdentityManager', 'esri/identity/OAuthInfo'], (esriId, OAuthInfo) => {
            // SHARING URL //
            const portalSharingURL = `${ esriConfig.portalUrl }/sharing`;

            //
            // OAUTH //
            //
            if (this.app?.oauthappid) {
              requiresAuthentication = true;
              signInMessage = `Application created via OAuth. [ ${ (new Date()).toLocaleString() } ]`;

              // CONFIGURE OAUTH //
              const oauthInfo = new OAuthInfo({
                portalUrl: esriConfig.portalUrl,
                appId: this.app.oauthappid,
                popup: true
              });
              esriId.registerOAuthInfos([oauthInfo]);
            }

            // CHECK SIGN-IN STATUS //
            esriId.checkSignInStatus(portalSharingURL).then(() => {
              return esriId.getCredential(portalSharingURL);
            }).catch((error) => {
              requiresAuthentication && (this.app.authMode = 'immediate');
            }).then(() => {
              //
              // LOAD PORTAL //
              //
              this._loadPortal().then(() => {
                resolve(signInMessage);
              }).catch((error) => {

                // TODO: MORE RESEARCH NEEDED //
                // esriId.destroyCredentials();
                // this.app.displayError({name: "Loading Error...", message: error.message});
                // this._load().then(resolve).catch(reject);

              });
            });
          });
        }
      });

    });
  }

  /**
   *
   * @param params
   * @returns {Promise}
   * @private
   */
  _loadPortal(params = {}) {
    return new Promise((resolve, reject) => {
      require(['esri/portal/Portal'], (Portal) => {
        // CREATE PORTAL //
        const portal = new Portal({authMode: this.app?.authMode || 'auto', ...params});
        // LOAD PORTAL //
        portal.load().then(() => {
          Promise.all([
            this._loadGroup(portal),
            this._loadMap()
          ]).then(() => {
            this.portal = portal;
            resolve();
          }).catch(reject);
        }).catch(reject);
      });
    });
  }

  /**
   *
   * @param portal
   * @returns {Promise}
   * @private
   */
  _loadGroup(portal) {
    return new Promise((resolve, reject) => {
      if (GroupLoader.hasGroup(this.app)) {
        // GROUP LOADER //
        const groupLoader = new GroupLoader(this.app, portal);
        groupLoader.loadGroup().then(group => {
          this.group = group;
          resolve();
        }).catch(reject);
      } else {
        resolve();
      }
    });
  }

  /**
   *
   * @returns {Promise}
   * @private
   */
  _loadMap() {
    return new Promise((resolve, reject) => {
      if (MapLoader.hasMap(this.app)) {
        // MAP LOADER //
        const mapLoader = new MapLoader(this.app);
        mapLoader.loadMap().then(map => {
          this.map = map;
          this._createView(map).then(resolve).catch(reject);
        }).catch(reject);
      } else {
        resolve();
      }
    });
  }

  /**
   *
   * @param map
   * @returns {Promise}
   * @private
   */
  _createView(map) {
    return new Promise((resolve, reject) => {
      if (this.app.container && (document.getElementById(this.app.container) != null)) {

        // https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript
        const cleanParams = params => {
          return Object.entries(params).reduce((a, [k, v]) => (v == null ? a : (a[k] = v, a)), {});
        };

        const center = this.app?.getParam('center')?.split(',') || null;
        const zoom = this.app?.getParam('zoom', Number) || null;
        const rotation = this.app?.getParam('heading', Number) || null;

        const viewProperties = cleanParams({
          container: this.app.container,
          snapToZoom: Number.isInteger(zoom),
          map, center, zoom, rotation,
          ...this.app.viewProps || {}
        });

        const viewLoader = new ViewLoader(viewProperties);
        viewLoader.loadView().then(view => {
          this.view = view;
          resolve();
        }).catch(reject);

      } else {
        resolve();
      }
    });
  }

}

export default AppLoader;

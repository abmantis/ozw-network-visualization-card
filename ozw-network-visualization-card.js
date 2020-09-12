import "https://unpkg.com/vis-network@8.1.0/dist/vis-network.min.js?module";

function loadCSS(url) {
  const link = document.createElement("link");
  link.type = "text/css";
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

class OZWNetworkVisualizationCard extends HTMLElement {
  constructor() {
    super();
    this.bufferTime = 1000 * 60 * 5; //5 minutes
    this.attachShadow({
      mode: "open",
    });
    this.networkOptions = {
      autoResize: true,
      height: "1000px",
      layout: {
        improvedLayout: true,
      },
      physics: {
        barnesHut: {
          springConstant: 0,
          avoidOverlap: 10,
          damping: 0.09,
        },
      },
      nodes: {
        font: {
          multi: "html",
        },
      },
      edges: {
        smooth: {
          type: "continuous",
          forceDirection: "none",
          roundness: 0.6,
        },
      },
    };
  }

  setConfig(config) {
    // get & keep card-config and hass-interface
    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);

    this._config = Object.assign({}, config);

    // assemble html
    const card = document.createElement("ha-card");
    const content = document.createElement("div");

    this.filterdiv = document.createElement("div");
    this.filterdiv.style = "display: flex; align-items: center";

    this.filterlable = document.createElement("div");
    this.filterlable.innerHTML = "Search: ";

    this.filterinput = document.createElement("input");
    this.filterinput.placeholder = "Name, Node ID, Model, ...";

    this.filterdiv.appendChild(this.filterlable);
    this.filterdiv.appendChild(this.filterinput);
    card.appendChild(this.filterdiv);
    card.appendChild(content);

    this.device_registry = {};
    this.nodes = [];
    this.network = new vis.Network(content, {}, this.networkOptions);

    this.filterinput.oninput = function () {
      let filterednodes = this.nodes.filter((x) =>
        x.label.toLowerCase().includes(this.filterinput.value.toLowerCase())
      );
      this.network.selectNodes(filterednodes.map((x) => x.id));
    }.bind(this);

    root.appendChild(card);
  }

  _updateContent(data) {
    this._updateDevices(data.devices);
  }

  _updateDevices(devices) {
    this.nodes = [];
    var edges = [];

    devices.map((device) => {
      this.nodes.push({
        id: device.node_id,
        label: this._buildLabel(device),
        shape: this._getShape(device),
        mass: this._getMass(device),
        color: {
          highlight: {
            border: "#0048ff",
            background: "#00fbff",
          },
        },
      });
      if (device.neighbors && device.neighbors.length > 0) {
        device.neighbors.map((neighbor) => {
          var idx = edges.findIndex(function (e) {
            return device.node_id === e.to && neighbor === e.from;
          });
          if (idx === -1) {
            edges.push({
              from: device.node_id,
              to: neighbor,
              label: "",
              color: this._getLQI(255), // TODO: can we get some sort of LQI?
            });
          }
        });
      }
    });

    this.network.setData({ nodes: this.nodes, edges: edges });
  }

  _getLQI(lqi) {
    if (lqi > 192) {
      //darken unselected edges, and brightly mark edges of the selected node (or edge)
      return { color: "#17ab00", highlight: "yellow" };
    } else if (lqi > 128) {
      return { color: "#e6b402", highlight: "#e6b402" };
    } else if (lqi > 80) {
      return { color: "#fc4c4c", highlight: "#fc4c4c" };
    }
    return { color: "#bfbfbf", highlight: "#bfbfbf" };
  }

  _getMass(device) {
    if (device.node_basic_string === "Static Controller") {
      return 2;
    } else if (device.node_basic_string === "Routing Slave") {
      return 4;
    } else {
      return 5;
    }
  }

  _getShape(device) {
    if (device.node_basic_string === "Static Controller") {
      return "box";
    } else if (device.node_basic_string === "Routing Slave") {
      return "ellipse";
    } else {
      return "circle";
    }
  }

  _buildLabel(device) {
    var regDevice = this.device_registry[device.ozw_instance][device.node_id];
    if (regDevice === undefined) {
      return;
    }

    var avertage_rtt = Math.round(
      (parseInt(device.statistics.average_request_rtt) +
        parseInt(device.statistics.average_response_rtt)) /
        2.0
    );

    var res = regDevice
      ? "<b>" + (regDevice.name_by_user || regDevice.name) + "</b>\n"
      : "";
    res += "<b>Model: </b>" + regDevice.model + "\n";
    res += "<b>Node: </b>" + device.node_id + "\n";
    res += "<b>RTT: </b>" + avertage_rtt + " | ";
    res +=
      "<b>Send Count: </b>" +
      device.statistics.send_count +
      " (" +
      device.statistics.sent_failed +
      " failed)" +
      "\n";
    res += (device.is_routing ? "Routing" : "Not routing") + " | ";
    res += (device.is_awake ? "Awake" : "Sleeping") + " | ";
    res += (device.is_beaming ? "Beaming" : "Not beaming") + "";

    if (device.is_failed) {
      res += "\n<b>DEVICE FAILED</b>";
    }
    return res;
  }

  _fetchNodeStatistics(hass, node) {
    return hass
      .callWS({
        type: "ozw/node_statistics",
        ozw_instance: node.ozw_instance,
        node_id: node.node_id,
      })
      .then((node_stat) => {
        node.statistics = node_stat;
      });
  }

  _fetchInstanceNodes(hass, instance) {
    hass
      .callWS({
        type: "ozw/get_nodes",
        ozw_instance: instance,
      })
      .then((nodes) => {
        const stats_promises = [];
        nodes.forEach((node) => {
          stats_promises.push(this._fetchNodeStatistics(hass, node));
        });

        Promise.all(stats_promises).then((node_stats_list) => {
          console.log(nodes);
          this._updateContent({ devices: nodes });
        });
      });
  }

  _updateDeviceRegistry(device_registry) {
    let node_set = new Set();

    device_registry.forEach((device) => {
      const ozwIdentifier = device.identifiers.find(
        (identifier) => identifier[0] === "ozw"
      );
      if (!ozwIdentifier) {
        return;
      }
      const identifiers = ozwIdentifier[1].split(".");
      const ozw_instance = identifiers[0];
      const node_id = identifiers[1];

      const instante_node_id = ozw_instance + "." + node_id;
      if (node_set.has(instante_node_id)) {
        return;
      }
      node_set.add(instante_node_id);

      if (this.device_registry[ozw_instance] === undefined) {
        this.device_registry[ozw_instance] = {};
      }
      this.device_registry[ozw_instance][node_id] = device;
    });
  }

  set hass(hass) {
    if (
      this.lastUpdated &&
      new Date(this.lastUpdated + this.bufferTime) > Date.now()
    ) {
      return;
    }
    let nodes = [];

    hass
      .callWS({
        type: "config/device_registry/list",
      })
      .then((device_registry) => {
        this._updateDeviceRegistry(device_registry);

        hass
          .callWS({
            type: "ozw/get_instances",
          })
          .then((instances) => {
            instances.forEach((instance) => {
              // TODO: fix multi instance. ATM the last instance will win.
              this._fetchInstanceNodes(hass, instance.ozw_instance);
            });
          })
          .catch((error) => {
            console.warn("Failed to get instances: ", error.message);
          });
      });

    this.lastUpdated = Date.now();
  }

  getCardSize() {
    return 10;
  }
}

customElements.define(
  "ozw-network-visualization-card",
  OZWNetworkVisualizationCard
);

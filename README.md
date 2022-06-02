# OZW Network Visualization Card

Home Assistant custom card for visualizing the ZWave network.

This card works with the following integrations:

- [ZWave2MQTT](https://github.com/OpenZWave/Zwave2Mqtt).

ZWave network mapping can help you identify weak points in the network like isolated devices or troublesome areas of the mesh network.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

# Screenshots

![Overview](images/network_overview.png)

![Node detail](images/nodes_detail.png)

# Instalation

## Using HACS

You can install this card automatically with HACS. Just search for `ozw-network-visualization-card` there and install it.

## Manual installation instructions (without HACS)

**NOTE**: The following steps are for manual installation, without using HACS.

1. Put the [ozw-network-visualization-card.js](https://github.com/abmantis/ozw-network-visualization-card/blob/master/ozw-network-visualization-card.js) lovelace card into the `[config]/www/` directory ether by copying it there or by using the file editor to create it with a cut and paste of the content.
2. Add the lovelace resource with `Configuration ¦ Lovelace Dashboards ¦ Resources ¦ ⊕ ¦ URL:/local/ozw-network-visualization-card.js` & `Resource Type JavaScript Module ¦ Update`.
3. Restart Home Assistant.

# Configuration and usage

This card works both with [OpenZWave (beta)](https://www.home-assistant.io/integrations/ozw) and [ZWave2MQTT](https://github.com/OpenZWave/Zwave2Mqtt). To specify the correct integration use the `integration` config. attribute when adding the card to Home Assistant.

After installing it, follow the following steps to add it to Home Assistant UI:

1. Add a new tab (works best in panel mode) through `Overview ¦ ⋮ ¦ Configure UI ¦ New Tab + ¦ Give it a Title and any other options` and `select Panel Mode`.
2. Open the new tab, which will be empty, and click the `+ ADD CARD` button at the bottom right.
3. Choose the manual card type and a card configuration window will open, this is where you will add one of the following (depending on your ZWave integration):

   - Example using OpenZWave beta:

     ```
     type: 'custom:ozw-network-visualization-card'
     integration: ozw
     ```

   - Example using ZWave2MQTT beta:

     ```
     type: 'custom:ozw-network-visualization-card'
     integration: zwave2mqtt
     ```

4. Save and exit UI configurator.
5. Press CTRL+F5 if the card is not displayed.

## Searching, colors and connections

You can use the search box in the top left corner to highlight nodes. You can search for any text that is present on the node (name, model, node index, etc). You can also use regular expressions, such as "bedroom|kitchen", for example, to highlight both nodes containing "bedroom" or "kitchen in their name.

Each node is colored based on the average of their RTT, as reported by the integration. Nodes can be Red, Yellow or Green, depending on how bad or good their RTT is. The average RTT is also shown on the node.

An important thing to note regarding connections is that they are simply neighbors, and not routes. NodeA is a neighbor of NodeB if NodeB can see NodeA. It does not mean that NodeB will use NodeA to communicate.

---

Thanks to [dmulcahey](https://github.com/dmulcahey) for [the original card for ZHA](https://github.com/dmulcahey/zha-network-visualization-card).

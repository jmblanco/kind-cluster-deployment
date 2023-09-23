<p align="center"> 
  <img src="images/kind.png" alt="Kind Logo" width="250px" height="150px">
</p>
<h1 align="center"> Kubernetes Cluster with Kind </h1>
<h3 align="center"> Deploy Kubernetes with Kind in your local environment</h3>  

</br>

<p align="center"> 
  <img src="images/kubernetes.jpg" alt="Sample signal" width="90%">
</p>

<!-- TABLE OF CONTENTS -->
<h2 id="table-of-contents"> :book: Table of Contents</h2>

<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about"> ➤ About</a></li>
    <li><a href="#prerequisites"> ➤ Prerequisites</a></li>
    <li><a href="#folder-structure"> ➤ Folder Structure</a></li>
    <li><a href="#tools"> ➤ Tools</a></li>
    <li><a href="#usage"> ➤ Usage</a></li>
  </ol>
</details>


<!-- ABOUT THE PROJECT -->
<h2 id="about"> :pencil2: About</h2>

<p align="justify"> 
    This projects allows you to deploy a Kubernetes Cluster in your local environment with Kind with some other useful tools.
</p>

<!-- PREREQUISITES -->
<h2 id="prerequisites"> :pill: Prerequisites</h2>

[![made-with-bash](https://img.shields.io/badge/Made%20with-Bash-1f425f.svg)](https://www.gnu.org/software/bash/) <br>

<p align="justify"> 
    The following tools are required in order to deploy the cluster:
</p>

<a href="https://helm.sh/"><img src="https://img.shields.io/badge/helm-darkblue?style=for-the-badge&logo=helm"/></a>
<a href="https://helm.sh/"><img src="https://img.shields.io/badge/docker-darkblue?style=for-the-badge&logo=docker"/></a>

<a href="https://github.com/ahmetb/kubectx"><img src="https://img.shields.io/badge/kubectx-white?style=for-the-badge&logo=kubernetes"/></a>
<a href="https://kubernetes.io/docs/reference/kubectl/"><img src="https://img.shields.io/badge/kubectl-white?style=for-the-badge&logo=kubernetes"/></a>
<a href="https://kind.sigs.k8s.io/"><img src="https://img.shields.io/badge/kind-white?style=for-the-badge&logo=kubernetes"/></a>

<a href="https://kislyuk.github.io/yq/"><img src="https://img.shields.io/badge/yq-black?style=for-the-badge&logo=gnubash"/></a>

<!-- FOLDER STRUCTURE -->
<h2 id="folder-structure"> :open_file_folder: Folder Structure</h2>

    code
    .
    │
    ├── images // Used images in README.md
    ├── ingress // Usefull ingress for deployed tools
    ├── templates // K8s Templates & Related Config for deployed Tools
    └── init.sh // Init Bash Script

<!-- TOOLS -->
<h2 id="tools"> :link: Installed Tools</h2>

<p align="justify"> 
  With this repository you can install differents tools over Kind Cluster deployed on your local environment:
</p>
<ol>
  <li><a href="https://kind.sigs.k8s.io/"> ➤ Kind Cluster</a></li>
  <li><a href="https://hub.docker.com/_/registry"> ➤ Container Registry</a></li>
  <li><a href="https://www.mongodb.com/"> ➤ MongoDB Instance</a></li>
  <li><a href="https://docs.nginx.com/nginx-ingress-controller/"> ➤ NGINX Ingress Controller</a></li>
  <li><a href="https://strimzi.io/"> ➤ Kafka Broker - Stimzi</a></li>
  <li><a href="https://docs.kafka-ui.provectus.io/overview/readme"> ➤ Kafka UI</a></li>
  <li><a href="https://argo-cd.readthedocs.io/en/stable/"> ➤ ArgoCD</a></li>
</ol>

<!-- USAGE -->
<h2 id="usage"> :airplane: Usage</h2>
<p align="justify"> 
  You only have to execute following command, enjoy!
</p>
    
    ╰─ ./init.sh
    1) Create K8s Cluster
    2) Create & Link Registry
    3) Create & Link Create MongoDB Instance
    4) Install NGINX Ingress
    5) Install Kafka Broker & UI
    6) Install ArgoCD
    7) Install all
    8) Remove all
    0) Exit
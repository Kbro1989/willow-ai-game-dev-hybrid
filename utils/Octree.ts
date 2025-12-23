/**
 * Octree Spatial Partitioning for 3D Scene Optimization
 * Enables efficient raycasting, collision detection, and frustum culling
 */

import * as THREE from 'three';

interface OctreeNode {
  bounds: THREE.Box3;
  children: OctreeNode[] | null;
  objects: Set<string>;
  depth: number;
}

interface SceneObjectRef {
  id: string;
  position: THREE.Vector3;
  boundingBox: THREE.Box3;
}

const MAX_DEPTH = 8;
const MAX_OBJECTS_PER_NODE = 8;

export class Octree {
  private root: OctreeNode;
  private objectMap: Map<string, SceneObjectRef> = new Map();

  constructor(bounds: THREE.Box3) {
    this.root = this.createNode(bounds, 0);
  }

  private createNode(bounds: THREE.Box3, depth: number): OctreeNode {
    return {
      bounds,
      children: null,
      objects: new Set(),
      depth
    };
  }

  /**
   * Insert an object into the octree
   */
  insert(id: string, position: THREE.Vector3, size: THREE.Vector3 = new THREE.Vector3(1, 1, 1)): void {
    const halfSize = size.clone().multiplyScalar(0.5);
    const boundingBox = new THREE.Box3(
      position.clone().sub(halfSize),
      position.clone().add(halfSize)
    );

    const ref: SceneObjectRef = { id, position: position.clone(), boundingBox };
    this.objectMap.set(id, ref);
    this.insertIntoNode(this.root, ref);
  }

  private insertIntoNode(node: OctreeNode, obj: SceneObjectRef): void {
    // If this is a leaf node
    if (!node.children) {
      node.objects.add(obj.id);

      // Subdivide if we exceed capacity and haven't reached max depth
      if (node.objects.size > MAX_OBJECTS_PER_NODE && node.depth < MAX_DEPTH) {
        this.subdivide(node);

        // Re-insert all objects into children
        const objects = Array.from(node.objects);
        node.objects.clear();

        for (const id of objects) {
          const objRef = this.objectMap.get(id);
          if (objRef) {
            this.insertIntoNode(node, objRef);
          }
        }
      }
      return;
    }

    // Find which children this object intersects
    for (const child of node.children) {
      if (child.bounds.intersectsBox(obj.boundingBox)) {
        this.insertIntoNode(child, obj);
      }
    }
  }

  private subdivide(node: OctreeNode): void {
    const bounds = node.bounds;
    const center = bounds.getCenter(new THREE.Vector3());
    const children: OctreeNode[] = [];

    // Create 8 child octants
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const min = new THREE.Vector3(
            x === 0 ? bounds.min.x : center.x,
            y === 0 ? bounds.min.y : center.y,
            z === 0 ? bounds.min.z : center.z
          );
          const max = new THREE.Vector3(
            x === 0 ? center.x : bounds.max.x,
            y === 0 ? center.y : bounds.max.y,
            z === 0 ? center.z : bounds.max.z
          );

          children.push(this.createNode(new THREE.Box3(min, max), node.depth + 1));
        }
      }
    }

    node.children = children;
  }

  /**
   * Remove an object from the octree
   */
  remove(id: string): void {
    this.objectMap.delete(id);
    this.removeFromNode(this.root, id);
  }

  private removeFromNode(node: OctreeNode, id: string): void {
    node.objects.delete(id);

    if (node.children) {
      for (const child of node.children) {
        this.removeFromNode(child, id);
      }
    }
  }

  /**
   * Query objects within a bounding box
   */
  queryBox(box: THREE.Box3): string[] {
    const results: string[] = [];
    this.queryBoxNode(this.root, box, results);
    return results;
  }

  private queryBoxNode(node: OctreeNode, box: THREE.Box3, results: string[]): void {
    if (!node.bounds.intersectsBox(box)) {
      return;
    }

    node.objects.forEach(id => {
      const obj = this.objectMap.get(id);
      if (obj && box.intersectsBox(obj.boundingBox)) {
        results.push(id);
      }
    });

    if (node.children) {
      for (const child of node.children) {
        this.queryBoxNode(child, box, results);
      }
    }
  }

  /**
   * Query objects within a sphere (for distance-based queries)
   */
  querySphere(center: THREE.Vector3, radius: number): string[] {
    const box = new THREE.Box3(
      center.clone().subScalar(radius),
      center.clone().addScalar(radius)
    );

    const candidates = this.queryBox(box);
    const sphere = new THREE.Sphere(center, radius);

    return candidates.filter(id => {
      const obj = this.objectMap.get(id);
      return obj && sphere.intersectsBox(obj.boundingBox);
    });
  }

  /**
   * Raycast through the octree for efficient hit detection
   */
  raycast(ray: THREE.Ray, maxDistance: number = Infinity): string[] {
    const results: string[] = [];
    this.raycastNode(this.root, ray, maxDistance, results);
    return results;
  }

  private raycastNode(node: OctreeNode, ray: THREE.Ray, maxDistance: number, results: string[]): void {
    if (!ray.intersectsBox(node.bounds)) {
      return;
    }

    node.objects.forEach(id => {
      const obj = this.objectMap.get(id);
      if (obj && ray.intersectsBox(obj.boundingBox)) {
        const distance = ray.origin.distanceTo(obj.position);
        if (distance <= maxDistance) {
          results.push(id);
        }
      }
    });

    if (node.children) {
      for (const child of node.children) {
        this.raycastNode(child, ray, maxDistance, results);
      }
    }
  }

  /**
   * Frustum culling for camera visibility
   */
  queryFrustum(frustum: THREE.Frustum): string[] {
    const results: string[] = [];
    this.queryFrustumNode(this.root, frustum, results);
    return results;
  }

  private queryFrustumNode(node: OctreeNode, frustum: THREE.Frustum, results: string[]): void {
    if (!frustum.intersectsBox(node.bounds)) {
      return;
    }

    node.objects.forEach(id => {
      const obj = this.objectMap.get(id);
      if (obj && frustum.intersectsBox(obj.boundingBox)) {
        results.push(id);
      }
    });

    if (node.children) {
      for (const child of node.children) {
        this.queryFrustumNode(child, frustum, results);
      }
    }
  }

  /**
   * Get statistics about the octree
   */
  getStats(): { totalNodes: number, totalObjects: number, maxDepth: number } {
    let totalNodes = 0;
    let maxDepth = 0;

    const traverse = (node: OctreeNode) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, node.depth);

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    return {
      totalNodes,
      totalObjects: this.objectMap.size,
      maxDepth
    };
  }

  /**
   * Clear all objects from the octree
   */
  clear(): void {
    this.objectMap.clear();
    this.root = this.createNode(this.root.bounds, 0);
  }
}

/**
 * Factory function to create an octree for a scene
 */
export function createSceneOctree(worldSize: number = 1000): Octree {
  const halfSize = worldSize / 2;
  const bounds = new THREE.Box3(
    new THREE.Vector3(-halfSize, -halfSize, -halfSize),
    new THREE.Vector3(halfSize, halfSize, halfSize)
  );
  return new Octree(bounds);
}

export default Octree;

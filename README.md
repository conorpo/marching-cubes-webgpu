# Marching Cubes

## Authors
- Conor O'Malley
- [Nick Stuhldreher](https://www.nickst.dev/)


## Pipelines & Needed Resources

0. Noise Field Creation

    - (Output)  texture3d\<float> GridPoint Values

1. Marching Cubes (Triangle Creation)

    - (Input) texture3d\<float> GridPoint Values
    - (Input) Settings Buffer
    - (Input) Triangulation LUT Buffer
    - (Input / Output) Storage Buffer for Indices
    - (Input / Output) Storage Buffer for Indirect Args
    - (Input / Output) Storage Buffer for Vertices

2. Rasterization and Rendering

    - (Vertex Input) Vertex Buffer (position, normal)
    - (Input) Camera Settings
    - (Index Input) Index Buffer

## TODO
```
- support window and resolution resizing during runtime
- translate the noise and the mesh based on position, so that we have an endless space, shouldnt affect performance at all
- animate the noise itself somehow
- add some procedural / interesting coloring/texturing
- add this one fps counter library that is really clean looking (done)
- add additional sim settings
- store vertex buffers as seperate, so that they can be packed tightly
- add debug timing info (done)
- setup auto build
```

## BindGroups Overview
|                | BindGroup 0                          | BindGroup 1                                                                 | BindGroup 2  | BindGroup 3 |
|----------------|--------------------------------------|-----------------------------------------------------------------------------|--------------|-------------|
| Compute Noise  | Camera Info + Noise Storage Texture  | Noise Settings                                                              |              |             |
| Marching Cubes | Camera Info + Noise Storage Texture  | Marching Cube Settings + IndirectArgs + Vertex, Normal, Index Buffers, LUTs |              |             |
| Compute Noise  | Camera Info + Noise Storage Texture  | Noise Settings                                                              |              |             |
| Rendering      | Camera Info + Noise Storage Texture  |                                                                             |              |             |
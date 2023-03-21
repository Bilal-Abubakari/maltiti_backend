<?php

namespace App\Controller;

use Doctrine\ORM\EntityNotFoundException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use App\Repository\ProductsRepository;
use Symfony\Component\Serializer\SerializerInterface;

#[Route('/products')]
class ProductsController extends AbstractController
{
    public function __construct(
        private readonly ProductsRepository $productsRepository,
        private readonly SerializerInterface $serializer,
    )
    {
    }

    #[Route('/products', name: 'app_products')]
    public function index(): Response
    {
        return $this->render('products/index.html.twig', [
            'controller_name' => 'ProductsController',
        ]);
    }

    #[Route('/add', name: 'app_addProducts', methods: 'POST')]
    public function add(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent());
        $product = $this->productsRepository->create($payload);

        return new JsonResponse([
            'data' => $this->serializer->serialize($product, 'json'),
            'message' => 'New product added successfully'
        ]);
    }


    /**
     * @throws EntityNotFoundException
     */
    #[Route('/delete/{id}', name: 'app_deleteProducts', methods: 'DELETE')]
    public function delete(int $id): JsonResponse
    {
        $this->productsRepository->delete($id);
        return new JsonResponse([
            'message' => 'Product delete successfully'
        ]);
    }

    /**
     * @throws EntityNotFoundException
     */
    #[Route('/edit', name: 'app_editProducts', methods: 'POST')]
    public function edit(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent());
        $product = $this->productsRepository->edit($payload);

        return new JsonResponse([
            'data' => $this->serializer->serialize($product, 'json'),
            'message' => 'Product edited successfully'
        ]);
    }


    #[Route('/getProduct/{id}', name: 'app_getProducts', methods: 'GET')]
    public function getByID(int $id): JsonResponse
    {
        $product = $this->productsRepository->find($id);

        return new JsonResponse([
            'data' => $this->serializer->serialize($product, 'json'),
            'message' => 'Product loaded successfully'
        ]);
    }

    #[Route('/count', name: 'app_countProducts', methods: 'GET')]
    public function countProducts(): JsonResponse
    {
        $products = $this->productsRepository->getProducts();

        return new JsonResponse([
            'data' => count($products),
            'message' => 'Products total counted successfully'
        ]);
    }

    #[Route('/getProducts', name: 'app_getProducts', methods: 'GET')]
    public function getProducts(): JsonResponse
    {
        $products = $this->productsRepository->findAll();

        return new JsonResponse([
            'data' => $this->serializer->serialize($products, 'json'),
            'message' => 'Products loaded successfully'
        ]);
    }
}
